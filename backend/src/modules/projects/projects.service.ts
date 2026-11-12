import crypto from "node:crypto";

import { db } from "../../prisma/db";
import { FREE_PROJECT_LIMIT, getUserPlan } from "../plans/plans.service";

import fs from "node:fs/promises";
import path from "node:path";

const COVERS_DIR = path.resolve(process.cwd(), "uploads", "covers");
const MAX_COVER_BYTES = 1_500_000;

export async function saveProjectCover(
  id: number,
  userId: number,
  image: string,
) {
  const project = await db.orm.public.Project.first({ id, userId });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(image);

  if (!match) {
    throw new Error("INVALID_COVER");
  }

  const buffer = Buffer.from(match[1], "base64");

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

  if (!isJpeg || buffer.length > MAX_COVER_BYTES) {
    throw new Error("INVALID_COVER");
  }

  await fs.mkdir(COVERS_DIR, { recursive: true });

  // nome novo a cada captura: evita imagem antiga em cache
  const fileName = `project-${id}-${Date.now()}.jpg`;
  await fs.writeFile(path.join(COVERS_DIR, fileName), buffer);

  if (project.coverUrl) {
    await fs.rm(path.join(COVERS_DIR, path.basename(project.coverUrl)), {
      force: true,
    });
  }

  return db.orm.public.Project.where({ id }).update({
    coverUrl: `/uploads/covers/${fileName}`,
  });
}

function toTime(value: unknown) {
  const time = new Date(String(value ?? "")).getTime();
  return Number.isNaN(time) ? 0 : time;
}

async function getAuthor(userId: number) {
  const user = await db.orm.public.User.select("id", "name", "username").first({
    id: userId,
  });

  if (!user) return null;

  return {
    name: user.name,
    username: user.username,
  };
}

// Resumo do veículo: serve tanto para o rótulo ("Chevrolet Astra 2011")
// quanto para o 3D (o frontend usa id e model3dUrl para achar o modelo).
export async function getVehicleSummary(vehicleId: number) {
  const vehicle = await db.orm.public.Vehicle.select(
    "id",
    "generationId",
    "year",
    "version",
    "model3dUrl",
  ).first({ id: vehicleId });

  if (!vehicle) return null;

  const generation = await db.orm.public.CarGeneration.select(
    "id",
    "modelId",
    "name",
  ).first({ id: vehicle.generationId });

  const model = generation
    ? await db.orm.public.CarModel.select("id", "brandId", "name").first({
        id: generation.modelId,
      })
    : null;

  const brand = model
    ? await db.orm.public.CarBrand.select("id", "name").first({
        id: model.brandId,
      })
    : null;

  return {
    id: vehicle.id,
    year: vehicle.year,
    version: vehicle.version,
    model3dUrl: vehicle.model3dUrl,
    generationName: generation?.name ?? null,
    model: model
      ? {
          name: model.name,
          brand: brand ? { name: brand.name } : null,
        }
      : null,
  };
}

// Busca o resumo uma vez por veículo (vários projetos costumam repetir o carro).
export async function getVehicleSummaries(vehicleIds: number[]) {
  const uniqueIds = [...new Set(vehicleIds)];

  const entries = await Promise.all(
    uniqueIds.map(
      async (vehicleId) =>
        [vehicleId, await getVehicleSummary(vehicleId)] as const,
    ),
  );

  return new Map(entries);
}

export async function listProjectsByUser(userId: number) {
  const projects = await db.orm.public.Project.select(
    "id",
    "userId",
    "vehicleId",
    "name",
    "description",
    "coverUrl",
    "featuredAt",
    "mode",
    "isPublic",
    "shareToken",
    "createdAt",
    "updatedAt",
  )
    .where({ userId })
    .all();

  const summaries = await getVehicleSummaries(
    projects.map((project) => project.vehicleId),
  );

  return projects.map((project) => ({
    ...project,
    vehicle: summaries.get(project.vehicleId) ?? null,
  }));
}

export async function getProjectById(id: number, userId: number) {
  const project = await db.orm.public.Project.first({
    id,
    userId,
  });

  if (!project) return null;

  const vehicle = await getVehicleSummary(project.vehicleId);

  return { ...project, vehicle };
}

// Regras de plano ------------------------------------------------------------

// Projeto livre só é editável por quem está no Pro. Quando o Pro vence, os
// projetos livres continuam visíveis, mas ficam bloqueados para edição.
async function assertCanEditProject(
  project: { mode: string },
  userId: number,
) {
  if (project.mode !== "FREE") return;

  const { isPro } = await getUserPlan(userId);

  if (!isPro) {
    throw new Error("PROJECT_LOCKED");
  }
}

// Carros e peças premium só entram em projetos de quem está no Pro.
async function assertCanUseTier(tier: string, userId: number, code: string) {
  if (tier === "BASIC") return;

  const { isPro } = await getUserPlan(userId);

  if (!isPro) {
    throw new Error(code);
  }
}

// Criar (ou duplicar) um projeto: o Free só faz projeto real e até
// FREE_PROJECT_LIMIT projetos. O Pro não tem restrição.
async function assertCanCreateProject(userId: number, mode: string) {
  const { isPro } = await getUserPlan(userId);

  if (isPro) return;

  if (mode === "FREE") {
    throw new Error("PRO_REQUIRED");
  }

  const ownedProjects = await db.orm.public.Project.select("id")
    .where({ userId })
    .all();

  if (ownedProjects.length >= FREE_PROJECT_LIMIT) {
    throw new Error("PROJECT_LIMIT_REACHED");
  }
}

export async function createProject(
  userId: number,
  vehicleId: number,
  name: string,
  mode: "REAL" | "FREE",
) {
  await assertCanCreateProject(userId, mode);

  const vehicle = await db.orm.public.Vehicle.first({
    id: vehicleId,
  });

  if (!vehicle) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

  await assertCanUseTier(vehicle.tier, userId, "PREMIUM_VEHICLE");

  return db.orm.public.Project.create({
    userId,
    vehicleId,
    name,
    mode,
    isPublic: false,
  });
}

export async function updateProject(
  id: number,
  userId: number,
  name: string,
  mode: "REAL" | "FREE",
) {
  const project = await db.orm.public.Project.first({
    id,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (!name.trim()) {
    throw new Error("INVALID_PROJECT_NAME");
  }

  if (mode !== "REAL" && mode !== "FREE") {
    throw new Error("INVALID_PROJECT_MODE");
  }

  // Sem Pro só dá para ficar (ou virar) projeto real. Um projeto livre
  // existente fica bloqueado; converter para real continua permitido.
  if (mode === "FREE") {
    const { isPro } = await getUserPlan(userId);

    if (!isPro) {
      throw new Error(project.mode === "FREE" ? "PROJECT_LOCKED" : "PRO_REQUIRED");
    }
  }

  if (project.mode !== "REAL" && mode === "REAL") {
    const projectParts = await db.orm.public.ProjectPart.select("partId")
      .where({ projectId: id })
      .all();

    for (const projectPart of projectParts) {
      const compatibility = await db.orm.public.PartCompatibility.first({
        partId: projectPart.partId,
        vehicleId: project.vehicleId,
      });

      if (!compatibility || compatibility.level === "INCOMPATIBLE") {
        throw new Error("PROJECT_HAS_INCOMPATIBLE_PARTS");
      }
    }
  }

  return db.orm.public.Project.where({ id }).update({
    name: name.trim(),
    mode,
  });
}

export async function deleteProject(id: number, userId: number) {
  const project = await db.orm.public.Project.first({ id, userId });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  // .delete() remove UMA linha por chamada. Com várias peças ou curtidas,
  // sobravam linhas apontando para o projeto e o banco recusava a exclusão
  // (erro 23503). Por isso apagamos item a item, pelo id.
  const likes = await db.orm.public.ProjectLike.select("id")
    .where({ projectId: id })
    .all();

  await Promise.all(
    likes.map((like) =>
      db.orm.public.ProjectLike.where({ id: like.id }).delete(),
    ),
  );

  const projectParts = await db.orm.public.ProjectPart.select("id")
    .where({ projectId: id })
    .all();

  await Promise.all(
    projectParts.map((projectPart) =>
      db.orm.public.ProjectPart.where({ id: projectPart.id }).delete(),
    ),
  );

  // primeiro o projeto: se isso falhar, a capa continua intacta
  const deleted = await db.orm.public.Project.where({ id }).delete();

  // só depois remove o arquivo da capa (se falhar, sobra um arquivo solto,
  // o que é bem menos grave que um projeto com capa quebrada)
  if (project.coverUrl) {
    await fs
      .rm(path.join(COVERS_DIR, path.basename(project.coverUrl)), {
        force: true,
      })
      .catch((error) => console.error(error));
  }

  return deleted;
}

export async function duplicateProject(id: number, userId: number) {
  const project = await db.orm.public.Project.first({
    id,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  await assertCanCreateProject(userId, project.mode);

  const duplicatedProject = await db.orm.public.Project.create({
    userId,
    vehicleId: project.vehicleId,
    name: `${project.name} - Cópia`,
    description: project.description,
    mode: project.mode,
    isPublic: false,
  });

  const projectParts = await db.orm.public.ProjectPart.select(
    "partId",
    "quantity",
    "priceAtTime",
  )
    .where({ projectId: id })
    .all();

  for (const projectPart of projectParts) {
    await db.orm.public.ProjectPart.create({
      projectId: duplicatedProject.id,
      partId: projectPart.partId,
      quantity: projectPart.quantity,
      priceAtTime: projectPart.priceAtTime,
    });
  }

  // A cópia ganha um arquivo de capa próprio. Se apontasse para o mesmo
  // arquivo do original, excluir (ou trocar a capa de) um dos dois apagaria
  // a imagem do outro.
  if (project.coverUrl) {
    try {
      await fs.mkdir(COVERS_DIR, { recursive: true });

      const fileName = `project-${duplicatedProject.id}-${Date.now()}.jpg`;

      await fs.copyFile(
        path.join(COVERS_DIR, path.basename(project.coverUrl)),
        path.join(COVERS_DIR, fileName),
      );

      const withCover = await db.orm.public.Project.where({
        id: duplicatedProject.id,
      }).update({
        coverUrl: `/uploads/covers/${fileName}`,
      });

      return withCover ?? duplicatedProject;
    } catch (error) {
      // se o arquivo de capa do original não existe mais, a cópia sai sem capa
      console.error(error);
    }
  }

  return duplicatedProject;
}


export async function publishProject(
  id: number,
  userId: number,
  isPublic: boolean,
  details: { name?: string; description?: string } = {},
) {
  const project = await db.orm.public.Project.first({
    id,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  let shareToken = project.shareToken;

  if (isPublic && !shareToken) {
    shareToken = crypto.randomUUID();
  }

  const data: {
    isPublic: boolean;
    shareToken: string | null;
    publishedAt: string | null;
    featuredAt?: null;
    name?: string;
    description?: string | null;
  } = {
    isPublic,
    shareToken: isPublic ? shareToken : null,
    // ao editar uma publicação já ativa, mantém a data original
    publishedAt: isPublic
      ? project.isPublic && project.publishedAt
        ? project.publishedAt
        : new Date().toISOString()
      : null,
  };

  // despublicar também tira o projeto do destaque do perfil
  if (!isPublic) {
    data.featuredAt = null;
  }

  if (isPublic && details.name !== undefined) {
    data.name = details.name.trim();
  }

  if (isPublic && details.description !== undefined) {
    data.description = details.description.trim() || null;
  }

  return db.orm.public.Project.where({ id }).update(data);
}

export async function getPublicProject(shareToken: string) {
  if (!shareToken.trim()) {
    throw new Error("SHARE_TOKEN_INVALID");
  }

  const project = await db.orm.public.Project.first({
    shareToken: shareToken.trim(),
    isPublic: true,
  });

  if (!project) {
    throw new Error("PUBLIC_PROJECT_NOT_FOUND");
  }

  const projectParts = await db.orm.public.ProjectPart.select(
    "id",
    "projectId",
    "partId",
    "quantity",
    "priceAtTime",
  )
    .where({ projectId: project.id })
    .all();

  const parts = await Promise.all(
    projectParts.map(async (projectPart) => {
      const part = await db.orm.public.Part.select(
        "id",
        "categoryId",
        "name",
        "slug",
        "brand",
        "description",
        "estimatedPrice",
        "imageUrl",
        "modelUrl",
      ).first({
        id: projectPart.partId,
      });

      return {
        ...projectPart,
        part,
      };
    }),
  );

  const [author, vehicle] = await Promise.all([
    getAuthor(project.userId),
    getVehicleSummary(project.vehicleId),
  ]);

  return {
    project: {
      id: project.id,
      vehicleId: project.vehicleId,
      name: project.name,
      description: project.description,
      mode: project.mode,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      author,
      vehicle,
      coverUrl: project.coverUrl,
    },
    parts,
  };
}

export async function getFeed(page: number, limit: number) {
  const publicProjects = await db.orm.public.Project.select(
    "id",
    "userId",
    "vehicleId",
    "name",
    "description",
    "coverUrl",
    "mode",
    "shareToken",
    "publishedAt",
    "createdAt",
  )
    .where({ isPublic: true })
    .all();

  const sorted = publicProjects
    .filter((project) => project.shareToken)
    .sort(
      (a, b) =>
        toTime(b.publishedAt ?? b.createdAt) -
        toTime(a.publishedAt ?? a.createdAt),
    );

  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const pageItems = sorted.slice((page - 1) * limit, page * limit);

  const projects = await Promise.all(
    pageItems.map(async (project) => {
      const [author, vehicle, projectParts, likes] = await Promise.all([
        getAuthor(project.userId),
        getVehicleSummary(project.vehicleId),
        db.orm.public.ProjectPart.select("quantity", "priceAtTime")
          .where({ projectId: project.id })
          .all(),
        db.orm.public.ProjectLike.select("id")
          .where({ projectId: project.id })
          .all(),
      ]);

      const total = projectParts.reduce(
        (sum, item) => sum + item.priceAtTime * item.quantity,
        0,
      );

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        coverUrl: project.coverUrl,
        mode: project.mode,
        shareToken: project.shareToken,
        publishedAt: project.publishedAt ?? project.createdAt,
        author,
        vehicle,
        partsCount: projectParts.length,
        likesCount: likes.length,
        total,
      };
    }),
  );

  return { projects, page, totalPages };
}

export async function addPartToProject(
  projectId: number,
  userId: number,
  partId: number,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("INVALID_QUANTITY");
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  await assertCanEditProject(project, userId);

  const part = await db.orm.public.Part.first({
    id: partId,
  });

  if (!part) {
    throw new Error("PART_NOT_FOUND");
  }

  await assertCanUseTier(part.tier, userId, "PREMIUM_PART");

  const compatibility = await db.orm.public.PartCompatibility.first({
    partId,
    vehicleId: project.vehicleId,
  });

  if (
    project.mode === "REAL" &&
    (!compatibility || compatibility.level === "INCOMPATIBLE")
  ) {
    throw new Error("PART_NOT_COMPATIBLE");
  }

  const existingProjectPart = await db.orm.public.ProjectPart.first({
    projectId,
    partId,
  });

  if (existingProjectPart) {
    return db.orm.public.ProjectPart.where({
      id: existingProjectPart.id,
    }).update({
      quantity: existingProjectPart.quantity + quantity,
    });
  }

  return db.orm.public.ProjectPart.create({
    projectId,
    partId,
    quantity,
    priceAtTime: part.estimatedPrice,
  });
}

export async function updateProjectPartQuantity(
  projectId: number,
  userId: number,
  partId: number,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("INVALID_QUANTITY");
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  await assertCanEditProject(project, userId);

  const projectPart = await db.orm.public.ProjectPart.first({
    projectId,
    partId,
  });

  if (!projectPart) {
    throw new Error("PROJECT_PART_NOT_FOUND");
  }

  return db.orm.public.ProjectPart.where({ id: projectPart.id }).update({
    quantity,
  });
}

export async function removePartFromProject(
  projectId: number,
  userId: number,
  partId: number,
) {
  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  await assertCanEditProject(project, userId);

  return db.orm.public.ProjectPart.where({
    projectId,
    partId,
  }).delete();
}

export async function listProjectParts(projectId: number, userId: number) {
  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const projectParts = await db.orm.public.ProjectPart.select(
    "id",
    "projectId",
    "partId",
    "quantity",
    "priceAtTime",
    "createdAt",
    "updatedAt",
  )
    .where({ projectId })
    .all();

  const projectPartsWithDetails = await Promise.all(
    projectParts.map(async (projectPart) => {
      const part = await db.orm.public.Part.select(
        "id",
        "categoryId",
        "name",
        "slug",
        "brand",
        "description",
        "estimatedPrice",
        "imageUrl",
        "modelUrl",
        "createdAt",
        "updatedAt",
      ).first({
        id: projectPart.partId,
      });

      return {
        ...projectPart,
        part,
      };
    }),
  );

  return projectPartsWithDetails;
}

// Projeto em destaque no perfil (recurso Pro): um por conta, e só projeto
// público. Destacar um novo tira o destaque do anterior. Remover o destaque é
// sempre permitido, mesmo sem Pro.
export async function setProjectFeatured(
  id: number,
  userId: number,
  featured: boolean,
) {
  const project = await db.orm.public.Project.first({ id, userId });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (!featured) {
    return db.orm.public.Project.where({ id }).update({ featuredAt: null });
  }

  const { isPro } = await getUserPlan(userId);

  if (!isPro) {
    throw new Error("PRO_FEATURE_REQUIRED");
  }

  if (!project.isPublic) {
    throw new Error("PROJECT_NOT_PUBLIC");
  }

  // .update() mexe em UMA linha por chamada, então limpa o destaque antigo pelo id
  const ownProjects = await db.orm.public.Project.select("id", "featuredAt")
    .where({ userId })
    .all();

  for (const other of ownProjects) {
    if (other.id !== id && other.featuredAt) {
      await db.orm.public.Project.where({ id: other.id }).update({
        featuredAt: null,
      });
    }
  }

  return db.orm.public.Project.where({ id }).update({
    featuredAt: new Date().toISOString(),
  });
}

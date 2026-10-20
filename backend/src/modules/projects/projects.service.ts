import crypto from "node:crypto";

import { db } from "../../prisma/db";

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
async function getVehicleSummary(vehicleId: number) {
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
async function getVehicleSummaries(vehicleIds: number[]) {
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

export async function createProject(
  userId: number,
  vehicleId: number,
  name: string,
  mode: "REAL" | "FREE",
) {
  const vehicle = await db.orm.public.Vehicle.first({
    id: vehicleId,
  });

  if (!vehicle) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

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

  await db.orm.public.ProjectLike.where({ projectId: id }).delete();
  await db.orm.public.ProjectPart.where({ projectId: id }).delete();

  if (project.coverUrl) {
    await fs.rm(path.join(COVERS_DIR, path.basename(project.coverUrl)), {
      force: true,
    });
  }

  return db.orm.public.Project.where({ id }).delete();
}

export async function duplicateProject(id: number, userId: number) {
  const project = await db.orm.public.Project.first({
    id,
    userId,
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const duplicatedProject = await db.orm.public.Project.create({
    userId,
    vehicleId: project.vehicleId,
    name: `${project.name} - Cópia`,
    description: project.description,
    coverUrl: project.coverUrl,
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

  const part = await db.orm.public.Part.first({
    id: partId,
  });

  if (!part) {
    throw new Error("PART_NOT_FOUND");
  }

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

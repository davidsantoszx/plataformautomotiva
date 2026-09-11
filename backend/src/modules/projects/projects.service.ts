import { db } from '../../prisma/db'

export async function listProjectsByUser(userId: number) {
  return db.orm.public.Project
    .select(
      'id',
      'userId',
      'vehicleId',
      'name',
      'mode',
      'isPublic',
      'shareToken',
      'createdAt',
      'updatedAt',
    )
    .where({
      userId,
    })
    .all()
}

export async function getProjectById(
  id: number,
  userId: number,
) {
  return db.orm.public.Project.first({
    id,
    userId,
  })
}

export async function createProject(
  userId: number,
  vehicleId: number,
  name: string,
  mode: 'REAL' | 'FREE',
) {
  const vehicle = await db.orm.public.Vehicle.first({
    id: vehicleId,
  })

  if (!vehicle) {
    throw new Error('VEHICLE_NOT_FOUND')
  }

  return db.orm.public.Project.create({
    userId,
    vehicleId,
    name,
    mode,
    isPublic: false,
  })
}

export async function addPartToProject(
  projectId: number,
  userId: number,
  partId: number,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('INVALID_QUANTITY')
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const part = await db.orm.public.Part.first({
    id: partId,
  })

  if (!part) {
    throw new Error('PART_NOT_FOUND')
  }

  const compatibility =
    await db.orm.public.PartCompatibility.first({
      partId,
      vehicleId: project.vehicleId,
    })

  if (
    project.mode === 'REAL' &&
    (!compatibility ||
      compatibility.level === 'INCOMPATIBLE')
  ) {
    throw new Error('PART_NOT_COMPATIBLE')
  }

  const existingProjectPart =
    await db.orm.public.ProjectPart.first({
      projectId,
      partId,
    })

  if (existingProjectPart) {
    return db.orm.public.ProjectPart
      .where({
        id: existingProjectPart.id,
      })
      .update({
        quantity:
          existingProjectPart.quantity + quantity,
      })
  }

  return db.orm.public.ProjectPart.create({
    projectId,
    partId,
    quantity,
    priceAtTime: part.estimatedPrice,
  })
}

export async function updateProjectPartQuantity(
  projectId: number,
  userId: number,
  partId: number,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('INVALID_QUANTITY')
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const projectPart =
    await db.orm.public.ProjectPart.first({
      projectId,
      partId,
    })

  if (!projectPart) {
    throw new Error('PROJECT_PART_NOT_FOUND')
  }

  return db.orm.public.ProjectPart
    .where({
      id: projectPart.id,
    })
    .update({
      quantity,
    })
}

export async function removePartFromProject(
  projectId: number,
  userId: number,
  partId: number,
) {
  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  return db.orm.public.ProjectPart
    .where({
      projectId,
      partId,
    })
    .delete()
}

export async function listProjectParts(
  projectId: number,
  userId: number,
) {
  const project = await db.orm.public.Project.first({
    id: projectId,
    userId,
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const projectParts = await db.orm.public.ProjectPart
    .select(
      'id',
      'projectId',
      'partId',
      'quantity',
      'priceAtTime',
      'createdAt',
      'updatedAt',
    )
    .where({
      projectId,
    })
    .all()

  const projectPartsWithDetails =
    await Promise.all(
      projectParts.map(async (projectPart) => {
        const part =
          await db.orm.public.Part
            .select(
              'id',
              'categoryId',
              'name',
              'slug',
              'brand',
              'description',
              'estimatedPrice',
              'imageUrl',
              'modelUrl',
              'createdAt',
              'updatedAt',
            )
            .first({
              id: projectPart.partId,
            })

        return {
          ...projectPart,
          part,
        }
      }),
    )

  return projectPartsWithDetails
}
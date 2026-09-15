import crypto from 'node:crypto'

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
    .where({ userId })
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
  const vehicle =
    await db.orm.public.Vehicle.first({
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

export async function updateProject(
  id: number,
  userId: number,
  name: string,
  mode: 'REAL' | 'FREE',
) {
  const project =
    await db.orm.public.Project.first({
      id,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  if (!name.trim()) {
    throw new Error('INVALID_PROJECT_NAME')
  }

  if (mode !== 'REAL' && mode !== 'FREE') {
    throw new Error('INVALID_PROJECT_MODE')
  }

  if (project.mode !== 'REAL' && mode === 'REAL') {
    const projectParts =
      await db.orm.public.ProjectPart
        .select('partId')
        .where({ projectId: id })
        .all()

    for (const projectPart of projectParts) {
      const compatibility =
        await db.orm.public.PartCompatibility.first({
          partId: projectPart.partId,
          vehicleId: project.vehicleId,
        })

      if (
        !compatibility ||
        compatibility.level === 'INCOMPATIBLE'
      ) {
        throw new Error(
          'PROJECT_HAS_INCOMPATIBLE_PARTS',
        )
      }
    }
  }

  return db.orm.public.Project
    .where({ id })
    .update({
      name: name.trim(),
      mode,
    })
}

export async function deleteProject(
  id: number,
  userId: number,
) {
  const project =
    await db.orm.public.Project.first({
      id,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  await db.orm.public.ProjectPart
    .where({ projectId: id })
    .delete()

  return db.orm.public.Project
    .where({ id })
    .delete()
}

export async function duplicateProject(
  id: number,
  userId: number,
) {
  const project =
    await db.orm.public.Project.first({
      id,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const duplicatedProject =
    await db.orm.public.Project.create({
      userId,
      vehicleId: project.vehicleId,
      name: `${project.name} - Cópia`,
      mode: project.mode,
      isPublic: false,
    })

  const projectParts =
    await db.orm.public.ProjectPart
      .select(
        'partId',
        'quantity',
        'priceAtTime',
      )
      .where({ projectId: id })
      .all()

  for (const projectPart of projectParts) {
    await db.orm.public.ProjectPart.create({
      projectId: duplicatedProject.id,
      partId: projectPart.partId,
      quantity: projectPart.quantity,
      priceAtTime: projectPart.priceAtTime,
    })
  }

  return duplicatedProject
}

export async function publishProject(
  id: number,
  userId: number,
  isPublic: boolean,
) {
  const project =
    await db.orm.public.Project.first({
      id,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  let shareToken = project.shareToken

  if (isPublic && !shareToken) {
    shareToken = crypto.randomUUID()
  }

  return db.orm.public.Project
    .where({ id })
    .update({
      isPublic,
      shareToken: isPublic
        ? shareToken
        : null,
    })
}

export async function getPublicProject(
  shareToken: string,
) {
  if (!shareToken.trim()) {
    throw new Error('SHARE_TOKEN_INVALID')
  }

  const project =
    await db.orm.public.Project.first({
      shareToken: shareToken.trim(),
      isPublic: true,
    })

  if (!project) {
    throw new Error(
      'PUBLIC_PROJECT_NOT_FOUND',
    )
  }

  const projectParts =
    await db.orm.public.ProjectPart
      .select(
        'id',
        'projectId',
        'partId',
        'quantity',
        'priceAtTime',
      )
      .where({ projectId: project.id })
      .all()

  const parts = await Promise.all(
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

  return {
    project: {
      id: project.id,
      vehicleId: project.vehicleId,
      name: project.name,
      mode: project.mode,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    parts,
  }
}

export async function addPartToProject(
  projectId: number,
  userId: number,
  partId: number,
  quantity: number,
) {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    throw new Error('INVALID_QUANTITY')
  }

  const project =
    await db.orm.public.Project.first({
      id: projectId,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const part =
    await db.orm.public.Part.first({
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
    (
      !compatibility ||
      compatibility.level === 'INCOMPATIBLE'
    )
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
      .where({ id: existingProjectPart.id })
      .update({
        quantity:
          existingProjectPart.quantity +
          quantity,
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
  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    throw new Error('INVALID_QUANTITY')
  }

  const project =
    await db.orm.public.Project.first({
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
    throw new Error(
      'PROJECT_PART_NOT_FOUND',
    )
  }

  return db.orm.public.ProjectPart
    .where({ id: projectPart.id })
    .update({
      quantity,
    })
}

export async function removePartFromProject(
  projectId: number,
  userId: number,
  partId: number,
) {
  const project =
    await db.orm.public.Project.first({
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
  const project =
    await db.orm.public.Project.first({
      id: projectId,
      userId,
    })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const projectParts =
    await db.orm.public.ProjectPart
      .select(
        'id',
        'projectId',
        'partId',
        'quantity',
        'priceAtTime',
        'createdAt',
        'updatedAt',
      )
      .where({ projectId })
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
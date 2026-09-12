import { db } from '../../prisma/db'

export async function listCategories() {
  return db.orm.public.PartCategory
    .select(
      'id',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .all()
}

export async function getCategoryById(id: number) {
  return db.orm.public.PartCategory
    .select(
      'id',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .first({
      id,
    })
}

export async function createCategory(
  name: string,
  slug: string,
) {
  const existingName =
    await db.orm.public.PartCategory.first({
      name,
    })

  if (existingName) {
    throw new Error(
      'CATEGORY_NAME_ALREADY_EXISTS',
    )
  }

  const existingSlug =
    await db.orm.public.PartCategory.first({
      slug,
    })

  if (existingSlug) {
    throw new Error(
      'CATEGORY_SLUG_ALREADY_EXISTS',
    )
  }

  return db.orm.public.PartCategory.create({
    name,
    slug,
  })
}

export async function listPartsByCategory(
  categoryId: number,
) {
  return db.orm.public.Part
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
    .where({
      categoryId,
    })
    .all()
}

export async function getPartById(id: number) {
  return db.orm.public.Part
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
      id,
    })
}

export async function createPart(
  categoryId: number,
  name: string,
  slug: string,
  estimatedPrice: number,
  brand?: string,
  description?: string,
  imageUrl?: string,
  modelUrl?: string,
) {
  const category =
    await db.orm.public.PartCategory.first({
      id: categoryId,
    })

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND')
  }

  if (
    !Number.isFinite(estimatedPrice) ||
    estimatedPrice < 0
  ) {
    throw new Error('INVALID_ESTIMATED_PRICE')
  }

  const existingSlug =
    await db.orm.public.Part.first({
      categoryId,
      slug,
    })

  if (existingSlug) {
    throw new Error(
      'PART_SLUG_ALREADY_EXISTS',
    )
  }

  return db.orm.public.Part.create({
    categoryId,
    name,
    slug,
    brand,
    description,
    estimatedPrice,
    imageUrl,
    modelUrl,
  })
}

export async function listCompatibilitiesByVehicle(
  vehicleId: number,
) {
  const vehicle =
    await db.orm.public.Vehicle.first({
      id: vehicleId,
    })

  if (!vehicle) {
    throw new Error('VEHICLE_NOT_FOUND')
  }

  return db.orm.public.PartCompatibility
    .select(
      'id',
      'partId',
      'vehicleId',
      'level',
      'requiresAdaptation',
      'notes',
      'createdAt',
      'updatedAt',
    )
    .where({
      vehicleId,
    })
    .all()
}

export async function listCompatibilitiesByPart(
  partId: number,
) {
  const part =
    await db.orm.public.Part.first({
      id: partId,
    })

  if (!part) {
    throw new Error('PART_NOT_FOUND')
  }

  return db.orm.public.PartCompatibility
    .select(
      'id',
      'partId',
      'vehicleId',
      'level',
      'requiresAdaptation',
      'notes',
      'createdAt',
      'updatedAt',
    )
    .where({
      partId,
    })
    .all()
}

export async function createCompatibility(
  partId: number,
  vehicleId: number,
  level:
    | 'COMPATIBLE'
    | 'ADAPTATION'
    | 'INCOMPATIBLE',
  requiresAdaptation: boolean,
  notes?: string,
) {
  const part =
    await db.orm.public.Part.first({
      id: partId,
    })

  if (!part) {
    throw new Error('PART_NOT_FOUND')
  }

  const vehicle =
    await db.orm.public.Vehicle.first({
      id: vehicleId,
    })

  if (!vehicle) {
    throw new Error('VEHICLE_NOT_FOUND')
  }

  const existing =
    await db.orm.public.PartCompatibility.first({
      partId,
      vehicleId,
    })

  if (existing) {
    throw new Error(
      'COMPATIBILITY_ALREADY_EXISTS',
    )
  }

  const normalizedRequiresAdaptation =
    level === 'ADAPTATION' ||
    requiresAdaptation

  return db.orm.public.PartCompatibility.create({
    partId,
    vehicleId,
    level,
    requiresAdaptation:
      normalizedRequiresAdaptation,
    notes,
  })
}

export async function updateCompatibility(
  id: number,
  level?:
    | 'COMPATIBLE'
    | 'ADAPTATION'
    | 'INCOMPATIBLE',
  requiresAdaptation?: boolean,
  notes?: string,
) {
  const compatibility =
    await db.orm.public.PartCompatibility.first({
      id,
    })

  if (!compatibility) {
    throw new Error(
      'COMPATIBILITY_NOT_FOUND',
    )
  }

  const finalLevel =
    level || compatibility.level

  const finalRequiresAdaptation =
    finalLevel === 'ADAPTATION' ||
    Boolean(requiresAdaptation)

  return db.orm.public.PartCompatibility
    .where({
      id,
    })
    .update({
      level: finalLevel,
      requiresAdaptation:
        finalRequiresAdaptation,
      notes,
    })
}

export async function deleteCompatibility(
  id: number,
) {
  const compatibility =
    await db.orm.public.PartCompatibility.first({
      id,
    })

  if (!compatibility) {
    throw new Error(
      'COMPATIBILITY_NOT_FOUND',
    )
  }

  return db.orm.public.PartCompatibility
    .where({
      id,
    })
    .delete()
}
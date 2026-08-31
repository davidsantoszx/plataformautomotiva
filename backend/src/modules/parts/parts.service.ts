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
  const existingName = await db.orm.public.PartCategory.first({
    name,
  })

  if (existingName) {
    throw new Error('CATEGORY_NAME_ALREADY_EXISTS')
  }

  const existingSlug = await db.orm.public.PartCategory.first({
    slug,
  })

  if (existingSlug) {
    throw new Error('CATEGORY_SLUG_ALREADY_EXISTS')
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
  const category = await db.orm.public.PartCategory.first({
    id: categoryId,
  })

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND')
  }

  const existingSlug = await db.orm.public.Part.first({
    categoryId,
    slug,
  })

  if (existingSlug) {
    throw new Error('PART_SLUG_ALREADY_EXISTS')
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
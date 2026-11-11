import { db } from '../../prisma/db'
import {
  clearBasicCatalogCache,
  getBasicCatalogIds,
} from './catalog-access.service'

// includePremium: só quem está no Pro vê o catálogo completo. Os outros veem
// apenas marcas que tenham pelo menos um veículo BASIC.
export async function listBrands(includePremium = false) {
  const brands = await db.orm.public.CarBrand
    .select(
      'id',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .all()

  if (includePremium) return brands

  const { brandIds } = await getBasicCatalogIds()

  return brands.filter((brand) => brandIds.has(brand.id))
}

export async function getBrandById(id: number) {
  return db.orm.public.CarBrand
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

export async function createBrand(
  name: string,
  slug: string,
) {
  const existingName = await db.orm.public.CarBrand.first({
    name,
  })

  if (existingName) {
    throw new Error('BRAND_NAME_ALREADY_EXISTS')
  }

  const existingSlug = await db.orm.public.CarBrand.first({
    slug,
  })

  if (existingSlug) {
    throw new Error('BRAND_SLUG_ALREADY_EXISTS')
  }

  return db.orm.public.CarBrand.create({
    name,
    slug,
  })
}


export async function listModelsByBrand(
  brandId: number,
  includePremium = false,
) {
  const models = await db.orm.public.CarModel
    .select(
      'id',
      'brandId',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .where({
      brandId,
    })
    .all()

  if (includePremium) return models

  const { modelIds } = await getBasicCatalogIds()

  return models.filter((model) => modelIds.has(model.id))
}

export async function getModelById(id: number) {
  return db.orm.public.CarModel
    .select(
      'id',
      'brandId',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .first({
      id,
    })
}

export async function createModel(
  brandId: number,
  name: string,
  slug: string,
) {
  const brand = await db.orm.public.CarBrand.first({
    id: brandId,
  })

  if (!brand) {
    throw new Error('BRAND_NOT_FOUND')
  }

  const existingSlug = await db.orm.public.CarModel.first({
    brandId,
    slug,
  })

  if (existingSlug) {
    throw new Error('MODEL_SLUG_ALREADY_EXISTS')
  }

  return db.orm.public.CarModel.create({
    brandId,
    name,
    slug,
  })
}

export async function listGenerationsByModel(
  modelId: number,
  includePremium = false,
) {
  const generations = await db.orm.public.CarGeneration
    .select(
      'id',
      'modelId',
      'name',
      'yearStart',
      'yearEnd',
      'createdAt',
      'updatedAt',
    )
    .where({
      modelId,
    })
    .all()

  if (includePremium) return generations

  const { generationIds } = await getBasicCatalogIds()

  return generations.filter((generation) => generationIds.has(generation.id))
}

export async function getGenerationById(id: number) {
  return db.orm.public.CarGeneration
    .select(
      'id',
      'modelId',
      'name',
      'yearStart',
      'yearEnd',
      'createdAt',
      'updatedAt',
    )
    .first({
      id,
    })
}

export async function createGeneration(
  modelId: number,
  name: string,
  yearStart: number,
  yearEnd?: number,
) {
  const model = await db.orm.public.CarModel.first({
    id: modelId,
  })

  if (!model) {
    throw new Error('MODEL_NOT_FOUND')
  }

  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return db.orm.public.CarGeneration.create({
    modelId,
    name,
    slug,
    yearStart,
    yearEnd,
  })
}

export async function listVehiclesByGeneration(
  generationId: number,
  includePremium = false,
) {
  const query = db.orm.public.Vehicle
    .select(
      'id',
      'generationId',
      'year',
      'version',
      'model3dUrl',
      'tier',
      'engine',
      'transmission',
      'fuel',
      'bodyType',
      'drivetrain',
      'doors',
      'seats',
      'displacementCc',
      'powerHp',
      'torqueNm',
      'lengthMm',
      'widthMm',
      'heightMm',
      'wheelbaseMm',
      'weightKg',
      'consumptionCity',
      'consumptionHighway',
      'source',
      'externalId',
      'fipeCode',
      'createdAt',
      'updatedAt',
  )

  // quem não é Pro só recebe os veículos BASIC
  return includePremium
    ? query.where({ generationId }).all()
    : query.where({ generationId, tier: 'BASIC' }).all()
}

export async function getVehicleById(id: number) {
  return db.orm.public.Vehicle
    .select(
      'id',
      'generationId',
      'year',
      'version',
      'model3dUrl',
      'tier',
      'engine',
      'transmission',
      'fuel',
      'bodyType',
      'drivetrain',
      'doors',
      'seats',
      'displacementCc',
      'powerHp',
      'torqueNm',
      'lengthMm',
      'widthMm',
      'heightMm',
      'wheelbaseMm',
      'weightKg',
      'consumptionCity',
      'consumptionHighway',
      'source',
      'externalId',
      'fipeCode',
      'createdAt',
      'updatedAt',
    )
    .first({
      id,
    })
}

export async function createVehicle(
  generationId: number,
  year: number,
  version?: string,
  engine?: string,
  transmission?: string,
  fuel?: string,
  bodyType?: string,
  drivetrain?: string,
  doors?: number,
  seats?: number,
  displacementCc?: number,
  powerHp?: number,
  torqueNm?: number,
  lengthMm?: number,
  widthMm?: number,
  heightMm?: number,
  wheelbaseMm?: number,
  weightKg?: number,
  consumptionCity?: number,
  consumptionHighway?: number,
  source?: string,
  externalId?: string,
  fipeCode?: string,
  tier?: 'BASIC' | 'PREMIUM',
) {
  const generation = await db.orm.public.CarGeneration.first({
    id: generationId,
  })

  if (!generation) {
    throw new Error('GENERATION_NOT_FOUND')
  }

  const vehicle = await db.orm.public.Vehicle.create({
    generationId,
    year,
    version,
    engine,
    transmission,
    fuel,
    bodyType,
    drivetrain,
    doors,
    seats,
    displacementCc,
    powerHp,
    torqueNm,
    lengthMm,
    widthMm,
    heightMm,
    wheelbaseMm,
    weightKg,
    consumptionCity,
    consumptionHighway,
    source,
    externalId,
    fipeCode,
    ...(tier ? { tier } : {}),
  })

  // um veículo novo pode liberar marca, modelo e geração no catálogo básico
  clearBasicCatalogCache()

  return vehicle
}


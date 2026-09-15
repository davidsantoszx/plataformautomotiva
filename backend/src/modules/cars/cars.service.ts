import { db } from '../../prisma/db'

export async function listBrands() {
  return db.orm.public.CarBrand
    .select(
      'id',
      'name',
      'slug',
      'createdAt',
      'updatedAt',
    )
    .all()
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


export async function listModelsByBrand(brandId: number) {
  return db.orm.public.CarModel
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

export async function listGenerationsByModel(modelId: number) {
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
    .where({
    modelId,
    })
    .all()
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

  return db.orm.public.CarGeneration.create({
    modelId,
    name,
    yearStart,
    yearEnd,
  })
}

export async function listVehiclesByGeneration(
  generationId: number,
) {
  return db.orm.public.Vehicle
    .select(
      'id',
      'generationId',
      'year',
      'version',
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
    .where({
    generationId,
    })
    .all()
}

export async function getVehicleById(id: number) {
  return db.orm.public.Vehicle
    .select(
      'id',
      'generationId',
      'year',
      'version',
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
) {
  const generation = await db.orm.public.CarGeneration.first({
    id: generationId,
  })

  if (!generation) {
    throw new Error('GENERATION_NOT_FOUND')
  }

  return db.orm.public.Vehicle.create({
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
  })
}


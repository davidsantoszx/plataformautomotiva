import 'dotenv/config'

import { carpediaClient } from '../data/catalog/carpedia/carpedia.client.js'
import type {
  CarpediaBrand,
  CarpediaModel,
  CarpediaVersion,
} from '../data/catalog/carpedia/carpedia.type.js'
import { db } from '../src/prisma/db.js'

const SOURCE = 'carpedia'



function getBrandArg(): string | null {
  const argument = process.argv.find((arg) => arg.startsWith('--brand='))

  if (!argument) {
    return null
  }

  return argument
    .slice('--brand='.length)
    .trim()
    .toLowerCase()
}

function extractNumericYears(years: string[]): number[] {
  return years
    .map((year) => Number.parseInt(year, 10))
    .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2100)
}

function normalizeVersionName(version: CarpediaVersion): string {
  const name = version.versao?.trim() || version.nome?.trim()

  if (!name) {
    return `Versão ${version.id}`
  }

  return name
}

function buildExternalId(versionId: number, year: number): string {
  return `${versionId}:${year}`
}

async function getAllBrands(): Promise<CarpediaBrand[]> {
  const brands: CarpediaBrand[] = []

  let page = 1

  while (true) {
    const response = await carpediaClient.getBrands(page, 200)

    brands.push(...response.marcas)

const totalPages = response.paginacao?.totalPaginas ?? page

    if (page >= totalPages) {
      break
    }

    page++
  }

  return brands
}

async function getAllModels(
  brandSlug: string,
): Promise<CarpediaModel[]> {
  const models: CarpediaModel[] = []

  let page = 1

  while (true) {
    const response = await carpediaClient.getModelsByBrand(
      brandSlug,
      page,
      200,
    )

    models.push(...response.modelos)

const totalPages = response.paginacao?.totalPaginas ?? page

    if (page >= totalPages) {
      break
    }

    page++
  }

  return models
}

async function importBrand(
  brand: CarpediaBrand,
) {
  let localBrand = await db.orm.public.CarBrand.first({
    slug: brand.slug,
  })

  if (!localBrand) {
    localBrand = await db.orm.public.CarBrand.create({
      name: brand.nome.trim(),
      slug: brand.slug,
    })

    console.log(`  + Marca: ${brand.nome}`)
  } else if (localBrand.name !== brand.nome.trim()) {
    await db.orm.public.CarBrand
      .where({ id: localBrand.id })
      .update({
        name: brand.nome.trim(),
      })
  }

  return localBrand
}

async function importModel(
  brandId: number,
  model: CarpediaModel,
) {
  let localModel = await db.orm.public.CarModel.first({
    brandId,
    slug: model.slug,
  })

  if (!localModel) {
    localModel = await db.orm.public.CarModel.create({
      brandId,
      name: model.nome.trim(),
      slug: model.slug,
    })

    console.log(`    + Modelo: ${model.nome}`)
  } else if (localModel.name !== model.nome.trim()) {
    await db.orm.public.CarModel
      .where({ id: localModel.id })
      .update({
        name: model.nome.trim(),
      })
  }

  return localModel
}

async function importGeneration(
  modelId: number,
  modelName: string,
  years: number[],
) {
  if (years.length === 0) {
    return null
  }

  const yearStart = Math.min(...years)
  const yearEnd = Math.max(...years)

  const generationName = `${modelName} - Carpedia`

  let generation = await db.orm.public.CarGeneration.first({
    modelId,
    name: generationName,
  })

  if (!generation) {
    generation = await db.orm.public.CarGeneration.create({
      modelId,
      name: generationName,
      yearStart,
      yearEnd,
    })

    console.log(
      `      + Agrupamento interno: ${generationName} (${yearStart}-${yearEnd})`,
    )
  } else if (
    generation.yearStart !== yearStart ||
    generation.yearEnd !== yearEnd
  ) {
    await db.orm.public.CarGeneration
      .where({ id: generation.id })
      .update({
        yearStart,
        yearEnd,
      })
  }

  return generation
}

async function importVehicle(
  generationId: number,
  version: CarpediaVersion,
  year: number,
) {
  const versionName = normalizeVersionName(version)
  const externalId = buildExternalId(version.id, year)
  const fuel = version.combustiveis?.[0]?.trim() || undefined

  let vehicle = await db.orm.public.Vehicle.first({
    source: SOURCE,
    externalId,
  })

  if (vehicle) {
    await db.orm.public.Vehicle
      .where({ id: vehicle.id })
      .update({
        generationId,
        year,
        version: versionName,
        fuel,
      })

    return 'updated'
  }

  const existingVehicle = await db.orm.public.Vehicle.first({
    generationId,
    year,
    version: versionName,
  })

  if (existingVehicle) {
    if (existingVehicle.source === SOURCE) {
      await db.orm.public.Vehicle
        .where({ id: existingVehicle.id })
        .update({
          externalId,
          fuel,
        })

      return 'updated'
    }

    console.log(
      `      ! Conflito preservado: ${year} ${versionName} (vehicle ${existingVehicle.id})`,
    )

    return 'conflict'
  }

  await db.orm.public.Vehicle.create({
    generationId,
    year,
    version: versionName,
    fuel,
    source: SOURCE,
    externalId,
  })

  return 'created'
}

async function importModelCatalog(
  brandId: number,
  brandSlug: string,
  model: CarpediaModel,
) {
  const localModel = await importModel(brandId, model)

  const versionsResponse = await carpediaClient.getVersionsByModel(
  brandSlug,
  model.slug,
)

  const versions = versionsResponse.versoes as CarpediaVersion[]

  if (versions.length === 0) {
    console.log(`      - Nenhuma versão: ${model.nome}`)
    return {
      models: 1,
      versions: 0,
      vehiclesCreated: 0,
      vehiclesUpdated: 0,
      conflicts: 0,
    }
  }

  const allYears = versions.flatMap((version) =>
    extractNumericYears(version.anos ?? []),
  )

  const uniqueYears = [...new Set(allYears)].sort((a, b) => a - b)

  const generation = await importGeneration(
    localModel.id,
    model.nome,
    uniqueYears,
  )

  if (!generation) {
    console.log(`      - Nenhum ano numérico: ${model.nome}`)

    return {
      models: 1,
      versions: versions.length,
      vehiclesCreated: 0,
      vehiclesUpdated: 0,
      conflicts: 0,
    }
  }

  let vehiclesCreated = 0
  let vehiclesUpdated = 0
  let conflicts = 0

  for (const version of versions) {
    const years = extractNumericYears(version.anos ?? [])

    for (const year of years) {
      const result = await importVehicle(
        generation.id,
        version,
        year,
      )

      if (result === 'created') {
        vehiclesCreated++
      }

      if (result === 'updated') {
        vehiclesUpdated++
      }

      if (result === 'conflict') {
        conflicts++
      }
    }
  }

  return {
    models: 1,
    versions: versions.length,
    vehiclesCreated,
    vehiclesUpdated,
    conflicts,
  }
}

async function main() {
  const brandArg = getBrandArg()

  console.log('')
  console.log('==========================================')
  console.log('     IMPORTADOR DE CATÁLOGO CARPEDIA')
  console.log('==========================================')
  console.log('')

  if (brandArg) {
    console.log(`Marca selecionada: ${brandArg}`)
  } else {
    console.log('Modo: catálogo completo')
  }

  console.log('')

  const brands = await getAllBrands()

  let selectedBrands = brands

  if (brandArg) {
    selectedBrands = brands.filter(
      (brand) => brand.slug.toLowerCase() === brandArg,
    )

    if (selectedBrands.length === 0) {
      throw new Error(
        `Marca "${brandArg}" não encontrada na Carpedia.`,
      )
    }
  }

  let totalModels = 0
  let totalVersions = 0
  let totalVehiclesCreated = 0
  let totalVehiclesUpdated = 0
  let totalConflicts = 0

  for (const brand of selectedBrands) {
    console.log(`\n[MARCA] ${brand.nome}`)

    const localBrand = await importBrand(brand)

    const models = await getAllModels(brand.slug)

    console.log(`  Modelos encontrados: ${models.length}`)

    for (const model of models) {
      console.log(`\n  [MODELO] ${model.nome}`)

      const result = await importModelCatalog(
  localBrand.id,
  brand.slug,
  model,
)
      totalModels += result.models
      totalVersions += result.versions
      totalVehiclesCreated += result.vehiclesCreated
      totalVehiclesUpdated += result.vehiclesUpdated
      totalConflicts += result.conflicts
    }
  }

  console.log('')
  console.log('==========================================')
  console.log('             IMPORTAÇÃO FINAL')
  console.log('==========================================')
  console.log(`Marcas processadas: ${selectedBrands.length}`)
  console.log(`Modelos processados: ${totalModels}`)
  console.log(`Versões encontradas: ${totalVersions}`)
  console.log(`Veículos criados: ${totalVehiclesCreated}`)
  console.log(`Veículos atualizados: ${totalVehiclesUpdated}`)
  console.log(`Conflitos preservados: ${totalConflicts}`)
  console.log('==========================================')
  console.log('')
}

main()
  .catch((error) => {
    console.error('')
    console.error('ERRO NA IMPORTAÇÃO:')
    console.error(error)
    process.exit(1)
  })
 
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { db } from '../src/prisma/db'

/*
 * Catálogo de carros em arquivo (data/catalog/cars.json).
 *
 *   npm run catalog:export-cars  -> lê o banco e grava o cars.json
 *   npm run catalog:seed-cars    -> lê o cars.json e cria/atualiza o banco
 *
 * O seed é seguro para rodar várias vezes: só cria ou atualiza,
 * nunca apaga nada.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const carsPath = path.resolve(
  __dirname,
  '../data/catalog/cars.json',
)

type VehicleEntry = {
  year: number
  version?: string | null
  tier?: 'BASIC' | 'PREMIUM'
  model3dUrl?: string | null
  engine?: string | null
  transmission?: string | null
  fuel?: string | null
  bodyType?: string | null
  drivetrain?: string | null
  doors?: number | null
  seats?: number | null
  displacementCc?: number | null
  powerHp?: number | null
  torqueNm?: number | null
  lengthMm?: number | null
  widthMm?: number | null
  heightMm?: number | null
  wheelbaseMm?: number | null
  weightKg?: number | null
  consumptionCity?: number | null
  consumptionHighway?: number | null
  source?: string | null
  externalId?: string | null
  fipeCode?: string | null
}

type GenerationEntry = {
  name: string
  slug: string
  yearStart: number
  yearEnd?: number | null
  // GLB usado por todos os veículos da geração (um veículo pode
  // sobrescrever com o seu próprio model3dUrl)
  model3dUrl?: string | null
  vehicles: VehicleEntry[]
}

type ModelEntry = {
  name: string
  slug: string
  generations: GenerationEntry[]
}

type BrandEntry = {
  name: string
  slug: string
  models: ModelEntry[]
}

type CarsFile = {
  brands: BrandEntry[]
}

const VEHICLE_OPTIONAL_FIELDS = [
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
] as const

function byText(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR')
}

/*
 * Cada veículo vai numa linha só, para o arquivo ficar curto
 * e o git mostrar diferenças legíveis.
 */
function toJson(data: CarsFile) {
  return JSON.stringify(data, null, 2).replace(
    /\{[^{}]*"year"[^{}]*\}/g,
    (match) => JSON.stringify(JSON.parse(match)),
  )
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }

  return best
}

async function exportCars() {
  console.log('📤 Exportando catálogo do banco...')

  const brandRows = await db.orm.public.CarBrand
    .select('id', 'name', 'slug')
    .all()

  const brands: BrandEntry[] = []
  let vehicleCount = 0

  for (const brand of [...brandRows].sort((a, b) =>
    byText(a.name, b.name),
  )) {
    const modelRows = await db.orm.public.CarModel
      .where({ brandId: brand.id })
      .all()

    const models: ModelEntry[] = []

    for (const model of [...modelRows].sort((a, b) =>
      byText(a.name, b.name),
    )) {
      const generationRows = await db.orm.public.CarGeneration
        .where({ modelId: model.id })
        .all()

      const generations: GenerationEntry[] = []

      for (const generation of [...generationRows].sort(
        (a, b) => a.yearStart - b.yearStart,
      )) {
        const vehicleRows = await db.orm.public.Vehicle
          .where({ generationId: generation.id })
          .all()

        const sortedVehicles = [...vehicleRows].sort(
          (a, b) =>
            a.year - b.year ||
            byText(a.version ?? '', b.version ?? ''),
        )

        const vehicles: VehicleEntry[] = sortedVehicles.map(
          (row) => {
            const source = row as unknown as Record<
              string,
              unknown
            >

            const entry: Record<string, unknown> = {
              year: source.year,
            }

            if (source.version != null) {
              entry.version = source.version
            }

            entry.tier = source.tier ?? 'BASIC'

            for (const field of VEHICLE_OPTIONAL_FIELDS) {
              if (source[field] != null) {
                entry[field] = source[field]
              }
            }

            return entry as VehicleEntry
          },
        )

        const urls = sortedVehicles
          .map((row) => row.model3dUrl)
          .filter(
            (url): url is string =>
              typeof url === 'string' && url.length > 0,
          )

        const entry: GenerationEntry = {
          name: generation.name,
          slug: generation.slug,
          yearStart: generation.yearStart,
          yearEnd: generation.yearEnd ?? null,
          model3dUrl: mostCommon(urls),
          vehicles,
        }

        vehicleCount += vehicles.length
        generations.push(entry)
      }

      models.push({
        name: model.name,
        slug: model.slug,
        generations,
      })
    }

    brands.push({
      name: brand.name,
      slug: brand.slug,
      models,
    })
  }

  await fs.mkdir(path.dirname(carsPath), { recursive: true })
  await fs.writeFile(
    carsPath,
    toJson({ brands }) + '\n',
    'utf-8',
  )

  console.log(
    `✅ ${brands.length} marcas, ${vehicleCount} veículos gravados em data/catalog/cars.json`,
  )
}

function validateCars(data: CarsFile) {
  if (!data || !Array.isArray(data.brands)) {
    throw new Error('CARS_INVALID_FORMAT')
  }

  for (const brand of data.brands) {
    if (!brand.name?.trim() || !brand.slug?.trim()) {
      throw new Error('CARS_INVALID_BRAND')
    }

    for (const model of brand.models ?? []) {
      if (!model.name?.trim() || !model.slug?.trim()) {
        throw new Error(
          `CARS_INVALID_MODEL: ${brand.name}`,
        )
      }

      for (const generation of model.generations ?? []) {
        if (
          !generation.name?.trim() ||
          !generation.slug?.trim() ||
          !Number.isInteger(generation.yearStart)
        ) {
          throw new Error(
            `CARS_INVALID_GENERATION: ${model.name}`,
          )
        }

        for (const vehicle of generation.vehicles ?? []) {
          if (!Number.isInteger(vehicle.year)) {
            throw new Error(
              `CARS_INVALID_VEHICLE: ${model.name} ${generation.name}`,
            )
          }

          if (
            vehicle.tier !== undefined &&
            vehicle.tier !== 'BASIC' &&
            vehicle.tier !== 'PREMIUM'
          ) {
            throw new Error(
              `CARS_INVALID_TIER: ${model.name} ${vehicle.year}`,
            )
          }
        }
      }
    }
  }
}

async function seedCars() {
  console.log('📥 Importando carros de data/catalog/cars.json...')

  let file: string

  try {
    file = await fs.readFile(carsPath, 'utf-8')
  } catch {
    throw new Error(
      'Arquivo data/catalog/cars.json não encontrado. Rode antes: npm run catalog:export-cars',
    )
  }

  const data = JSON.parse(file) as CarsFile

  validateCars(data)

  const created = { brands: 0, models: 0, generations: 0, vehicles: 0 }
  const updated = { brands: 0, models: 0, generations: 0, vehicles: 0 }

  for (const brand of data.brands) {
    const brandSlug = brand.slug.trim().toLowerCase()
    const brandName = brand.name.trim()

    let brandRow = await db.orm.public.CarBrand.first({
      slug: brandSlug,
    })

    if (brandRow) {
      if (brandRow.name !== brandName) {
        await db.orm.public.CarBrand
          .where({ id: brandRow.id })
          .update({ name: brandName })

        updated.brands++
      }
    } else {
      brandRow = await db.orm.public.CarBrand.create({
        name: brandName,
        slug: brandSlug,
      })

      created.brands++
    }

    console.log(`\n🏷️  ${brandName}`)

    for (const model of brand.models ?? []) {
      const modelSlug = model.slug.trim().toLowerCase()
      const modelName = model.name.trim()

      const brandModels = await db.orm.public.CarModel
        .where({ brandId: brandRow.id })
        .all()

      let modelRow = brandModels.find(
        (item) => item.slug === modelSlug,
      )

      if (modelRow) {
        if (modelRow.name !== modelName) {
          await db.orm.public.CarModel
            .where({ id: modelRow.id })
            .update({ name: modelName })

          updated.models++
        }
      } else {
        modelRow = await db.orm.public.CarModel.create({
          brandId: brandRow.id,
          name: modelName,
          slug: modelSlug,
        })

        created.models++
      }

      console.log(`   🚗 ${modelName}`)

      for (const generation of model.generations ?? []) {
        const generationSlug = generation.slug
          .trim()
          .toLowerCase()

        const modelGenerations =
          await db.orm.public.CarGeneration
            .where({ modelId: modelRow.id })
            .all()

        let generationRow = modelGenerations.find(
          (item) => item.slug === generationSlug,
        )

        const generationData = {
          name: generation.name.trim(),
          yearStart: generation.yearStart,
          yearEnd: generation.yearEnd ?? undefined,
        }

        if (generationRow) {
          await db.orm.public.CarGeneration
            .where({ id: generationRow.id })
            .update(generationData)

          updated.generations++
        } else {
          generationRow = await db.orm.public.CarGeneration.create({
            modelId: modelRow.id,
            slug: generationSlug,
            ...generationData,
          })

          created.generations++
        }

        const existingVehicles = await db.orm.public.Vehicle
          .where({ generationId: generationRow.id })
          .all()

        let createdHere = 0
        let updatedHere = 0

        for (const vehicle of generation.vehicles ?? []) {
          const version = vehicle.version ?? null

          const existing = existingVehicles.find(
            (item) =>
              item.year === vehicle.year &&
              (item.version ?? null) === version,
          )

          const vehicleData = {
            generationId: generationRow.id,
            year: vehicle.year,
            version: version ?? undefined,
            tier: vehicle.tier ?? 'BASIC',
            model3dUrl:
              vehicle.model3dUrl ??
              generation.model3dUrl ??
              undefined,
            engine: vehicle.engine ?? undefined,
            transmission: vehicle.transmission ?? undefined,
            fuel: vehicle.fuel ?? undefined,
            bodyType: vehicle.bodyType ?? undefined,
            drivetrain: vehicle.drivetrain ?? undefined,
            doors: vehicle.doors ?? undefined,
            seats: vehicle.seats ?? undefined,
            displacementCc: vehicle.displacementCc ?? undefined,
            powerHp: vehicle.powerHp ?? undefined,
            torqueNm: vehicle.torqueNm ?? undefined,
            lengthMm: vehicle.lengthMm ?? undefined,
            widthMm: vehicle.widthMm ?? undefined,
            heightMm: vehicle.heightMm ?? undefined,
            wheelbaseMm: vehicle.wheelbaseMm ?? undefined,
            weightKg: vehicle.weightKg ?? undefined,
            consumptionCity: vehicle.consumptionCity ?? undefined,
            consumptionHighway:
              vehicle.consumptionHighway ?? undefined,
            source: vehicle.source ?? undefined,
            externalId: vehicle.externalId ?? undefined,
            fipeCode: vehicle.fipeCode ?? undefined,
          }

          if (existing) {
            await db.orm.public.Vehicle
              .where({ id: existing.id })
              .update(vehicleData)

            updated.vehicles++
            updatedHere++
          } else {
            await db.orm.public.Vehicle.create(vehicleData)

            created.vehicles++
            createdHere++
          }
        }

        console.log(
          `      ✓ ${generation.name}: ${createdHere} criados, ${updatedHere} atualizados`,
        )
      }
    }
  }

  console.log('\n✅ Catálogo de carros importado')
  console.log(
    `   Criados:     ${created.brands} marcas, ${created.models} modelos, ${created.generations} gerações, ${created.vehicles} veículos`,
  )
  console.log(
    `   Atualizados: ${updated.brands} marcas, ${updated.models} modelos, ${updated.generations} gerações, ${updated.vehicles} veículos`,
  )
  console.log(
    '\n⚠️  Reinicie o backend para o filtro do plano Free recarregar o catálogo.',
  )
}

async function main() {
  const command = process.argv[2]

  if (command === 'export') {
    await exportCars()
    return
  }

  if (command === 'seed') {
    await seedCars()
    return
  }

  console.log('Uso:')
  console.log('  tsx scripts/carsCatalog.ts export')
  console.log('  tsx scripts/carsCatalog.ts seed')

  process.exitCode = 1
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error('\n❌ Erro:', error)

    process.exit(1)
  })
import 'dotenv/config'
import { existsSync } from 'node:fs'
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
 * nunca apaga nada. Um veículo que já existe em outra geração (catálogo
 * antigo) é adotado: o seed o encontra por source + externalId e o move
 * para a geração do cars.json.
 *
 * Para limpar do banco tudo o que NÃO está no cars.json:
 *   npm run catalog:clean-cars        -> seed + SIMULA a limpeza
 *   npm run catalog:clean-cars:apply  -> seed + apaga de verdade
 * Veículos usados por projetos nunca são apagados.
 *
 * Modelos 3D: se a geração não tiver model3dUrl no cars.json, o seed
 * procura o arquivo pela convenção
 *
 *   frontend/public/models/cars/<marca>/<modelo>/<modelo>-<geracao>.glb
 *
 * (ex.: volkswagen/gol/gol-g4.glb). O model3dUrl só é gravado no banco
 * quando o arquivo existe, então um carro sem GLB nunca aponta para um
 * link quebrado. Ao final, o seed lista os arquivos que ainda faltam.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const carsPath = path.resolve(
  __dirname,
  '../data/catalog/cars.json',
)

// pasta pública do frontend (backend e frontend são pastas irmãs)
const publicDir = path.resolve(
  __dirname,
  '../../frontend/public',
)

const missingModels = new Set<string>()

function resolveModel3dUrl(
  brandSlug: string,
  modelSlug: string,
  generationSlug: string,
  explicitUrl?: string | null,
) {
  // se o slug da geração já começa com o do modelo (lancer-x), não repete
  const fileName = generationSlug.startsWith(`${modelSlug}-`)
    ? generationSlug
    : `${modelSlug}-${generationSlug}`

  const url =
    explicitUrl?.trim() ||
    `/models/cars/${brandSlug}/${modelSlug}/${fileName}.glb`

  // link externo (CDN, etc.): não dá para conferir no disco
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  if (existsSync(path.join(publicDir, url))) {
    return url
  }

  missingModels.add(url)

  return undefined
}

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
  const keepVehicleIds = new Set<number>()

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

        const generationModelUrl = resolveModel3dUrl(
          brandSlug,
          modelSlug,
          generationSlug,
          generation.model3dUrl,
        )

        const existingVehicles = await db.orm.public.Vehicle
          .where({ generationId: generationRow.id })
          .all()

        let createdHere = 0
        let updatedHere = 0

        for (const vehicle of generation.vehicles ?? []) {
          const version = vehicle.version ?? null

          let existing = existingVehicles.find(
            (item) =>
              item.year === vehicle.year &&
              (item.version ?? null) === version,
          )

          // já existe em outra geração (catálogo antigo)? adota o veículo
          if (!existing && vehicle.source && vehicle.externalId) {
            existing =
              (await db.orm.public.Vehicle.first({
                source: vehicle.source,
                externalId: vehicle.externalId,
              })) ?? undefined
          }

          const vehicleData = {
            generationId: generationRow.id,
            year: vehicle.year,
            version: version ?? undefined,
            tier: vehicle.tier ?? 'BASIC',
            model3dUrl: vehicle.model3dUrl
              ? resolveModel3dUrl(
                  brandSlug,
                  modelSlug,
                  generationSlug,
                  vehicle.model3dUrl,
                )
              : generationModelUrl,
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

            keepVehicleIds.add(existing.id)
            updated.vehicles++
            updatedHere++
          } else {
            const createdVehicle =
              await db.orm.public.Vehicle.create(vehicleData)

            keepVehicleIds.add(createdVehicle.id)
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

  if (missingModels.size > 0) {
    console.log(
      '\n📦 Modelos 3D esperados que ainda não existem (solte o GLB e rode o seed de novo):',
    )

    for (const url of [...missingModels].sort()) {
      console.log(`   frontend/public${url}`)
    }
  }

  if (process.argv.includes('--prune')) {
    await pruneCatalog(
      keepVehicleIds,
      process.argv.includes('--apply'),
    )
  }

  console.log(
    '\n⚠️  Reinicie o backend para o filtro do plano Free recarregar o catálogo.',
  )
}

/*
 * Apaga do banco tudo o que não está no cars.json.
 * Sem --apply só mostra o que seria apagado.
 */
async function pruneCatalog(
  keepVehicleIds: Set<number>,
  apply: boolean,
) {
  console.log('\n🧹 Limpeza do catálogo')

  const projectRows = await db.orm.public.Project
    .select('id', 'vehicleId')
    .all()

  const projectVehicleIds = new Set<number>()

  for (const row of projectRows) {
    const vehicleId = (row as unknown as { vehicleId: number | null })
      .vehicleId

    if (typeof vehicleId === 'number') {
      projectVehicleIds.add(vehicleId)
    }
  }

  const vehicleRows = await db.orm.public.Vehicle.select('id').all()

  const doomed = vehicleRows
    .map((row) => row.id)
    .filter(
      (id) =>
        !keepVehicleIds.has(id) && !projectVehicleIds.has(id),
    )

  const keptByProject = [...projectVehicleIds].filter(
    (id) => !keepVehicleIds.has(id),
  )

  const doomedSet = new Set(doomed)

  const compatRows = await db.orm.public.PartCompatibility
    .select('id', 'vehicleId')
    .all()

  const doomedCompat = compatRows.filter((row) =>
    doomedSet.has(row.vehicleId),
  )

  console.log(`   Veículos no banco:            ${vehicleRows.length}`)
  console.log(`   Veículos do cars.json (fica): ${keepVehicleIds.size}`)
  console.log(`   Veículos a apagar:            ${doomed.length}`)
  console.log(`   Compatibilidades a apagar:    ${doomedCompat.length}`)

  if (keptByProject.length > 0) {
    console.log(
      `   ⚠️  ${keptByProject.length} veículo(s) fora do cars.json ficam porque projetos os usam.`,
    )
  }

  if (!apply) {
    console.log(
      '\n   Simulação: nada foi apagado. Para apagar de verdade rode: npm run catalog:clean-cars:apply',
    )

    return
  }

  let done = 0

  for (const row of doomedCompat) {
    await db.orm.public.PartCompatibility
      .where({ id: row.id })
      .delete()
  }

  for (const id of doomed) {
    await db.orm.public.Vehicle.where({ id }).delete()

    done++

    if (done % 2000 === 0) {
      console.log(`   ... ${done}/${doomed.length} veículos apagados`)
    }
  }

  console.log(`   ✓ ${doomed.length} veículos apagados`)

  // gerações, modelos e marcas que ficaram vazios
  let removedGenerations = 0
  let removedModels = 0
  let removedBrands = 0

  const brandRows = await db.orm.public.CarBrand
    .select('id', 'name', 'slug')
    .all()

  for (const brand of brandRows) {
    const modelRows = await db.orm.public.CarModel
      .where({ brandId: brand.id })
      .all()

    let remainingModels = modelRows.length

    for (const model of modelRows) {
      const generationRows = await db.orm.public.CarGeneration
        .where({ modelId: model.id })
        .all()

      let remainingGenerations = generationRows.length

      for (const generation of generationRows) {
        const vehicles = await db.orm.public.Vehicle
          .where({ generationId: generation.id })
          .all()

        if (vehicles.length === 0) {
          await db.orm.public.CarGeneration
            .where({ id: generation.id })
            .delete()

          removedGenerations++
          remainingGenerations--
        }
      }

      if (remainingGenerations === 0) {
        await db.orm.public.CarModel
          .where({ id: model.id })
          .delete()

        removedModels++
        remainingModels--
      }
    }

    if (remainingModels === 0) {
      await db.orm.public.CarBrand
        .where({ id: brand.id })
        .delete()

      removedBrands++
    }
  }

  console.log(
    `   ✓ Removidos também: ${removedGenerations} gerações, ${removedModels} modelos, ${removedBrands} marcas`,
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
  console.log('  tsx scripts/carsCatalog.ts seed --prune          (simula a limpeza)')
  console.log('  tsx scripts/carsCatalog.ts seed --prune --apply  (apaga de verdade)')

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
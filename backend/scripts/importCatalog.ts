import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { db } from '../src/prisma/db'

type CategoryInput = {
  name: string
  slug: string
}

type PartInput = {
  name: string
  slug: string
  brand?: string | null
  description?: string | null
  estimatedPrice: number
  imageUrl?: string | null
  modelUrl?: string | null
}

type CompatibilityInput = {
  partSlug: string
  partCategorySlug: string
  vehicleId: number
  level:
    | 'COMPATIBLE'
    | 'ADAPTATION'
    | 'INCOMPATIBLE'
  requiresAdaptation?: boolean
  notes?: string | null
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const catalogPath = path.resolve(
  __dirname,
  '../data/catalog',
)

const categoriesPath = path.join(
  catalogPath,
  'categories.json',
)

const partsPath = path.join(
  catalogPath,
  'parts',
)

const compatibilitiesPath = path.join(
  catalogPath,
  'compatibilities',
)

const vehiclesPath = path.join(
  catalogPath,
  'vehicles',
) 

async function readJsonFile<T>(
  filePath: string,
): Promise<T> {
  const file = await fs.readFile(
    filePath,
    'utf-8',
  )

  return JSON.parse(file) as T
}

async function getJsonFiles(
  directory: string,
) {
  const files = await fs.readdir(
    directory,
    {
      withFileTypes: true,
    },
  )

  return files
    .filter(
      (file) =>
        file.isFile() &&
        file.name
          .toLowerCase()
          .endsWith('.json'),
    )
    .map((file) =>
      path.join(
        directory,
        file.name,
      ),
    )
}

function validateCategory(
  category: CategoryInput,
) {
  if (
    typeof category.name !== 'string' ||
    !category.name.trim()
  ) {
    throw new Error(
      'CATEGORY_INVALID_NAME',
    )
  }

  if (
    typeof category.slug !== 'string' ||
    !category.slug.trim()
  ) {
    throw new Error(
      'CATEGORY_INVALID_SLUG',
    )
  }
}

function validatePart(
  part: PartInput,
) {
  if (
    typeof part.name !== 'string' ||
    !part.name.trim()
  ) {
    throw new Error(
      'PART_INVALID_NAME',
    )
  }

  if (
    typeof part.slug !== 'string' ||
    !part.slug.trim()
  ) {
    throw new Error(
      'PART_INVALID_SLUG',
    )
  }

  if (
    !Number.isFinite(
      part.estimatedPrice,
    ) ||
    part.estimatedPrice < 0
  ) {
    throw new Error(
      `PART_INVALID_PRICE: ${part.slug}`,
    )
  }
}

function validateCompatibility(
  compatibility: CompatibilityInput,
) {
  if (
    !Number.isInteger(
      compatibility.vehicleId,
    )
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_VEHICLE',
    )
  }

  if (
    typeof compatibility.partSlug !==
      'string' ||
    !compatibility.partSlug.trim()
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_PART',
    )
  }

  if (
    typeof compatibility
      .partCategorySlug !==
      'string' ||
    !compatibility
      .partCategorySlug.trim()
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_CATEGORY',
    )
  }

  if (
    compatibility.level !==
      'COMPATIBLE' &&
    compatibility.level !==
      'ADAPTATION' &&
    compatibility.level !==
      'INCOMPATIBLE'
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_LEVEL',
    )
  }

  if (
    compatibility
      .requiresAdaptation !==
      undefined &&
    typeof compatibility
      .requiresAdaptation !==
      'boolean'
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_ADAPTATION',
    )
  }

  if (
    compatibility.notes !== undefined &&
    compatibility.notes !== null &&
    typeof compatibility.notes !==
      'string'
  ) {
    throw new Error(
      'COMPATIBILITY_INVALID_NOTES',
    )
  }
}

async function importCategories() {
  console.log(
    '📁 Importando categorias...',
  )

  const categories =
    await readJsonFile<
      CategoryInput[]
    >(categoriesPath)

  if (!Array.isArray(categories)) {
    throw new Error(
      'CATEGORIES_INVALID_FORMAT',
    )
  }

  for (const category of categories) {
    validateCategory(category)

    const slug =
      category.slug
        .trim()
        .toLowerCase()

    const existing =
      await db.orm.public.PartCategory.first(
        {
          slug,
        },
      )

    if (existing) {
      console.log(
        `  ✓ Categoria encontrada: ${category.name}`,
      )

      continue
    }

    await db.orm.public.PartCategory.create(
      {
        name:
          category.name.trim(),
        slug,
      },
    )

    console.log(
      `  + Categoria criada: ${category.name}`,
    )
  }
}

async function importParts() {
  console.log(
    '\n🔧 Importando peças...',
  )

  const files =
    await getJsonFiles(
      partsPath,
    )

  for (const filePath of files) {
    const fileName =
      path.basename(
        filePath,
        '.json',
      )

    const categorySlug =
      fileName
        .trim()
        .toLowerCase()

    const category =
      await db.orm.public.PartCategory.first(
        {
          slug: categorySlug,
        },
      )

    if (!category) {
      console.log(
        `  ⚠️ Categoria não encontrada para ${fileName}. Arquivo ignorado.`,
      )

      continue
    }

    const parts =
      await readJsonFile<
        PartInput[]
      >(filePath)

    if (!Array.isArray(parts)) {
      throw new Error(
        `PARTS_INVALID_FORMAT: ${fileName}`,
      )
    }

    console.log(
      `\n  📦 ${category.name}`,
    )

    for (const part of parts) {
      validatePart(part)

      const slug =
        part.slug
          .trim()
          .toLowerCase()

      const existing =
        await db.orm.public.Part.first(
          {
            categoryId:
              category.id,
            slug,
          },
        )

      if (existing) {
        await db.orm.public.Part
          .where({
            id: existing.id,
          })
          .update({
            name:
              part.name.trim(),
            brand:
              part.brand?.trim() ||
              undefined,
            description:
              part.description
                ?.trim() ||
              undefined,
            estimatedPrice:
              part.estimatedPrice,
            imageUrl:
              part.imageUrl?.trim() ||
              undefined,
            modelUrl:
              part.modelUrl?.trim() ||
              undefined,
          })

        console.log(
          `     ✓ Atualizada: ${part.name}`,
        )

        continue
      }

      await db.orm.public.Part.create(
        {
          categoryId:
            category.id,
          name:
            part.name.trim(),
          slug,
          brand:
            part.brand?.trim() ||
            undefined,
          description:
            part.description
              ?.trim() ||
            undefined,
          estimatedPrice:
            part.estimatedPrice,
          imageUrl:
            part.imageUrl?.trim() ||
            undefined,
          modelUrl:
            part.modelUrl?.trim() ||
            undefined,
        },
      )

      console.log(
        `     + Criada: ${part.name}`,
      )
    }
  }
}

async function importCompatibilities() {
  console.log(
    '\n🔗 Importando compatibilidades...',
  )

  const files =
    await getJsonFiles(
      compatibilitiesPath,
    )

  for (const filePath of files) {
    const compatibilities =
      await readJsonFile<
        CompatibilityInput[]
      >(filePath)

    if (
      !Array.isArray(
        compatibilities,
      )
    ) {
      throw new Error(
        `COMPATIBILITIES_INVALID_FORMAT: ${path.basename(filePath)}`,
      )
    }

    console.log(
      `\n  📄 ${path.basename(filePath)}`,
    )

    for (const compatibility of
      compatibilities) {
      validateCompatibility(
        compatibility,
      )

      const category =
        await db.orm.public.PartCategory.first(
          {
            slug: compatibility
              .partCategorySlug
              .trim()
              .toLowerCase(),
          },
        )

      if (!category) {
        console.log(
          `     ⚠️ Categoria não encontrada: ${compatibility.partCategorySlug}`,
        )

        continue
      }

      const part =
        await db.orm.public.Part.first(
          {
            categoryId:
              category.id,
            slug: compatibility
              .partSlug
              .trim()
              .toLowerCase(),
          },
        )

      if (!part) {
        console.log(
          `     ⚠️ Peça não encontrada: ${compatibility.partSlug}`,
        )

        continue
      }

      const vehicle =
        await db.orm.public.Vehicle.first(
          {
            id: compatibility.vehicleId,
          },
        )

      if (!vehicle) {
        console.log(
          `     ⚠️ Veículo não encontrado: ${compatibility.vehicleId}`,
        )

        continue
      }

      const requiresAdaptation =
        compatibility.level ===
          'ADAPTATION' ||
        compatibility
          .requiresAdaptation ===
          true

      const existing =
        await db.orm.public.PartCompatibility.first(
          {
            partId: part.id,
            vehicleId:
              compatibility.vehicleId,
          },
        )

      if (existing) {
        await db.orm.public.PartCompatibility
          .where({
            id: existing.id,
          })
          .update({
            level:
              compatibility.level,
            requiresAdaptation,
            notes:
              compatibility.notes
                ?.trim() ||
              undefined,
          })

        console.log(
          `     ✓ Atualizada: ${part.name} → veículo ${vehicle.id}`,
        )

        continue
      }

      await db.orm.public.PartCompatibility.create(
        {
          partId: part.id,
          vehicleId:
            compatibility.vehicleId,
          level:
            compatibility.level,
          requiresAdaptation,
          notes:
            compatibility.notes
              ?.trim() ||
            undefined,
        },
      )

      console.log(
        `     + Criada: ${part.name} → veículo ${vehicle.id}`,
      )
    }
  }
}

async function importVehicles() {
  console.log(
    '\n🚗 Importando veículos...',
  )

  try {
    await fs.access(vehiclesPath)
  } catch {
    console.log(
      '  ⚠️ Diretório de veículos não encontrado. Importação ignorada.',
    )

    return
  }

  const files =
    await getJsonFiles(
      vehiclesPath,
    )

  for (const filePath of files) {
    const fileName =
      path.basename(
        filePath,
        '.json',
      )

    const vehicles =
      await readJsonFile<
        Array<{
          generationId: number
          year: number
          version?: string | null
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
        }>
      >(filePath)

    if (!Array.isArray(vehicles)) {
      throw new Error(
        `VEHICLES_INVALID_FORMAT: ${fileName}`,
      )
    }

    console.log(
      `\n  📄 ${fileName}`,
    )

    for (const vehicle of vehicles) {
      if (
        !Number.isInteger(
          vehicle.generationId,
        ) ||
        !Number.isInteger(
          vehicle.year,
        )
      ) {
        throw new Error(
          `VEHICLE_INVALID_DATA: ${fileName}`,
        )
      }

      const generation =
        await db.orm.public.CarGeneration.first(
          {
            id: vehicle.generationId,
          },
        )

      if (!generation) {
        console.log(
          `     ⚠️ Geração não encontrada: ${vehicle.generationId}`,
        )

        continue
      }

      const existing =
        await db.orm.public.Vehicle.first(
          {
            generationId:
              vehicle.generationId,
            year: vehicle.year,
            version:
              vehicle.version ??
              undefined,
          },
        )

      const vehicleData = {
        generationId:
          vehicle.generationId,
        year:
          vehicle.year,
        version:
          vehicle.version ??
          undefined,
        engine:
          vehicle.engine ??
          undefined,
        transmission:
          vehicle.transmission ??
          undefined,
        fuel:
          vehicle.fuel ??
          undefined,
        bodyType:
          vehicle.bodyType ??
          undefined,
        drivetrain:
          vehicle.drivetrain ??
          undefined,
        doors:
          vehicle.doors ??
          undefined,
        seats:
          vehicle.seats ??
          undefined,
        displacementCc:
          vehicle.displacementCc ??
          undefined,
        powerHp:
          vehicle.powerHp ??
          undefined,
        torqueNm:
          vehicle.torqueNm ??
          undefined,
        lengthMm:
          vehicle.lengthMm ??
          undefined,
        widthMm:
          vehicle.widthMm ??
          undefined,
        heightMm:
          vehicle.heightMm ??
          undefined,
        wheelbaseMm:
          vehicle.wheelbaseMm ??
          undefined,
        weightKg:
          vehicle.weightKg ??
          undefined,
        consumptionCity:
          vehicle.consumptionCity ??
          undefined,
        consumptionHighway:
          vehicle.consumptionHighway ??
          undefined,
        source:
          vehicle.source ??
          undefined,
        externalId:
          vehicle.externalId ??
          undefined,
        fipeCode:
          vehicle.fipeCode ??
          undefined,
      }

      if (existing) {
        await db.orm.public.Vehicle
          .where({
            id: existing.id,
          })
          .update(vehicleData)

        console.log(
          `     ✓ Atualizado: ${vehicle.version ?? vehicle.year}`,
        )

        continue
      }

      await db.orm.public.Vehicle.create(
        vehicleData,
      )

      console.log(
        `     + Criado: ${vehicle.version ?? vehicle.year}`,
      )
    }
  }
}


async function main() {
  console.log(
    '🚗 ========================================',
  )
  console.log(
    '🚗 IMPORTADOR DE CATÁLOGO',
  )
  console.log(
    '🚗 ========================================',
  )

  await importCategories()
  await importParts()
  await importCompatibilities()
  await importVehicles()

  console.log(
    '\n✅ ========================================',
  )
  console.log(
    '✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO',
  )
  console.log(
    '✅ ========================================',
  )
}

main()
  .catch((error) => {
    console.error(
      '\n❌ Erro durante a importação:',
      error,
    )

    process.exit(1)
  })

  
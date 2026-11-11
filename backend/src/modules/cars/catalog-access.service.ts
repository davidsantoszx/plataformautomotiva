import { db } from '../../prisma/db'

// Quem não é Pro só enxerga o catálogo BÁSICO. A "fonte da verdade" é o tier
// de cada veículo; marca, modelo e geração aparecem no Free apenas se tiverem
// pelo menos um veículo básico. Montar esses conjuntos exige ler veículos,
// gerações e modelos, então o resultado fica em memória por 60 segundos (com
// milhares de veículos importados, isso evita refazer a conta a cada clique).
const CACHE_TTL_MS = 60_000

type BasicCatalogIds = {
  brandIds: Set<number>
  modelIds: Set<number>
  generationIds: Set<number>
}

let cache: (BasicCatalogIds & { expiresAt: number }) | null = null

// Chamar depois de criar ou reclassificar veículos por código.
export function clearBasicCatalogCache() {
  cache = null
}

export async function getBasicCatalogIds(): Promise<BasicCatalogIds> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache
  }

  const basicVehicles = await db.orm.public.Vehicle.select('generationId')
    .where({ tier: 'BASIC' })
    .all()

  const generationIds = new Set(
    basicVehicles.map((vehicle) => vehicle.generationId),
  )

  const generations = await db.orm.public.CarGeneration.select(
    'id',
    'modelId',
  ).all()

  const modelIds = new Set(
    generations
      .filter((generation) => generationIds.has(generation.id))
      .map((generation) => generation.modelId),
  )

  const models = await db.orm.public.CarModel.select('id', 'brandId').all()

  const brandIds = new Set(
    models
      .filter((model) => modelIds.has(model.id))
      .map((model) => model.brandId),
  )

  cache = {
    brandIds,
    modelIds,
    generationIds,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }

  return cache
}

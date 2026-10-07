import 'dotenv/config'

import { db } from '../src/prisma/db.js'

const BASE_URL =
  'https://api.tabelafipe.info/api/v1'

const SOURCE = 'tabelafipe'

type ApiBrand = {
  slug: string
  name: string
  models: number
}

type ApiBrandsResponse = {
  tipo: string
  count: number
  brands: ApiBrand[]
}

type ApiFamily = {
  slug: string
  name: string
  versions: number
}

type ApiModelsResponse = {
  tipo: string
  marca: string
  brand_name: string
  count: number
  families: ApiFamily[]
}

type ApiPrice = {
  versao: string
  ano: number
  zero_km: boolean
  combustivel: string
  codigo_fipe: string
  valor: string
  valor_centavos: number | string
  url: string
}

type ApiPricesResponse = {
  tipo: string
  marca: string
  familia: string
  referencia: string
  total: number
  precos: ApiPrice[]
}

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getBrandArg(): string | null {
  const argument =
    process.argv.find((arg) =>
      arg.startsWith('--brand='),
    )

  if (!argument) {
    return null
  }

  return argument
    .slice('--brand='.length)
    .trim()
    .toLowerCase()
}

function getLimit(): number | undefined {
  const argument =
    process.argv.find((arg) =>
      arg.startsWith('--limit='),
    )

  if (!argument) {
    return undefined
  }

  const value =
    argument
      .slice('--limit='.length)
      .trim()

  const limit =
    Number.parseInt(
      value,
      10,
    )

  if (
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    throw new Error(
      `Valor inválido para --limit: ${value}`,
    )
  }

  return limit
}

async function sleep(
  milliseconds: number,
): Promise<void> {
  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  )
}

async function getJson<T>(
  endpoint: string,
): Promise<T> {
  const response =
    await fetch(
      `${BASE_URL}${endpoint}`,
    )

  if (response.ok) {
    return response.json() as Promise<T>
  }

  if (response.status === 429) {
    const retryAfter =
      Number.parseInt(
        response.headers.get(
          'retry-after',
        ) ?? '60',
        10,
      )

    console.log(
      `  ⚠️ Limite da API atingido. Aguardando ${retryAfter}s...`,
    )

    await sleep(
      Math.max(
        retryAfter,
        1,
      ) * 1000,
    )

    return getJson<T>(
      endpoint,
    )
  }

  const body =
    await response.text()

  throw new Error(
    `API ${response.status}: ${endpoint}\n${body}`,
  )
}

async function getApiBrands(): Promise<
  ApiBrand[]
> {
  const data =
    await getJson<ApiBrandsResponse>(
      '/carros/marcas',
    )

  return data.brands ?? []
}

function resolveBrand(
  selectedName: string,
  apiBrands: ApiBrand[],
): ApiBrand | null {
  const normalized =
    selectedName
      .trim()
      .toLowerCase()

  const direct =
    apiBrands.find(
      (brand) =>
        brand.name
          .trim()
          .toLowerCase() ===
        normalized,
    )

  if (direct) {
    return direct
  }

  const slug =
    slugify(selectedName)

  const bySlug =
    apiBrands.find(
      (brand) =>
        brand.slug === slug,
    )

  if (bySlug) {
    return bySlug
  }

  return null
}

async function importBrand(
  brandName: string,
  apiBrand: ApiBrand,
) {
  const name =
    normalizeText(
      brandName,
    )

  const slug =
    slugify(name)

  let brand =
    await db.orm.public.CarBrand.first(
      {
        slug,
      },
    )

  if (!brand) {
    brand =
      await db.orm.public.CarBrand.create(
        {
          name,
          slug,
        },
      )

    console.log(
      `  + Marca: ${name}`,
    )
  } else if (
    brand.name !== name
  ) {
    await db.orm.public.CarBrand
      .where({
        id: brand.id,
      })
      .update({
        name,
      })
  }

  return brand
}

async function importModel(
  brandId: number,
  familyName: string,
) {
  const name =
    normalizeText(
      familyName,
    )

  const slug =
    slugify(name)

  let model =
    await db.orm.public.CarModel.first(
      {
        brandId,
        slug,
      },
    )

  if (!model) {
    model =
      await db.orm.public.CarModel.create(
        {
          brandId,
          name,
          slug,
        },
      )

    console.log(
      `    + Modelo: ${name}`,
    )
  }

  return model
}

async function importGeneration(
  modelId: number,
  modelName: string,
  prices: ApiPrice[],
) {
  const years =
    prices
      .map(
        (price) =>
          Number(price.ano),
      )
      .filter(
        (year) =>
          Number.isInteger(year),
      )

  if (
    years.length === 0
  ) {
    return null
  }

  const yearStart =
    Math.min(...years)

  const yearEnd =
    Math.max(...years)

  const generationName =
    `${modelName} - tabelaFIPE`

  let generation =
    await db.orm.public.CarGeneration.first(
      {
        modelId,
        name: generationName,
      },
    )

  if (!generation) {
    generation =
      await db.orm.public.CarGeneration.create(
        {
          modelId,
          name: generationName,
          slug: slugify(generationName),
          yearStart,
          yearEnd,
        },
      )
  } else if (
    generation.yearStart !==
      yearStart ||
    generation.yearEnd !==
      yearEnd
  ) {
    await db.orm.public.CarGeneration
      .where({
        id: generation.id,
      })
      .update({
        yearStart,
        yearEnd,
      })
  }

  return generation
}

function buildExternalId(
  fipeCode: string,
  year: number,
): string {
  return `${fipeCode}:${year}`
}

async function importVehicle(
  generationId: number,
  price: ApiPrice,
) {
  const year =
    Number(price.ano)

  const fipeCode =
    normalizeText(
      price.codigo_fipe,
    )

  const version =
    normalizeText(
      price.versao,
    )

  const fuel =
    normalizeText(
      price.combustivel,
    )

  const externalId =
    buildExternalId(
      fipeCode,
      year,
    )

  let vehicle =
    await db.orm.public.Vehicle.first(
      {
        fipeCode,
        year,
      },
    )

  const vehicleData = {
    generationId,
    year,
    version:
      version || undefined,
    fuel:
      fuel || undefined,
    source: SOURCE,
    externalId,
    fipeCode,
  }

  if (vehicle) {
    await db.orm.public.Vehicle
      .where({
        id: vehicle.id,
      })
      .update(
        vehicleData,
      )

    return 'updated'
  }

  vehicle =
    await db.orm.public.Vehicle.first(
      {
        source: SOURCE,
        externalId,
      },
    )

  if (vehicle) {
    await db.orm.public.Vehicle
      .where({
        id: vehicle.id,
      })
      .update(
        vehicleData,
      )

    return 'updated'
  }

  await db.orm.public.Vehicle.create(
    vehicleData,
  )

  return 'created'
}

async function importFamily(
  apiBrand: ApiBrand,
  family: ApiFamily,
) {
  const endpoint =
    `/carros/${apiBrand.slug}/familia/${family.slug}/precos`

  let data: ApiPricesResponse

  try {
    data =
      await getJson<ApiPricesResponse>(
        endpoint,
      )
  } catch (error) {
    console.log(
      `  ⚠️ ${apiBrand.name} / ${family.name}: preços não disponíveis. Família ignorada.`,
    )

    return {
      models: 0,
      created: 0,
      updated: 0,
    }
  }

  const prices =
    data.precos ?? []

  if (
    prices.length === 0
  ) {
    return {
      models: 0,
      created: 0,
      updated: 0,
    }
  }

  const brandName =
    normalizeText(
      data.marca ||
        apiBrand.name,
    )

  const modelName =
    normalizeText(
      data.familia ||
        family.name,
    )

  const localBrand =
    await importBrand(
      brandName,
      apiBrand,
    )

  const localModel =
    await importModel(
      localBrand.id,
      modelName,
    )

  const generation =
    await importGeneration(
      localModel.id,
      modelName,
      prices,
    )

  if (!generation) {
    return {
      models: 0,
      created: 0,
      updated: 0,
    }
  }

  let created = 0
  let updated = 0

  const processed =
    new Set<string>()

  for (
    const price of prices
  ) {
    const year =
      Number(price.ano)

    const fipeCode =
      normalizeText(
        price.codigo_fipe,
      )

    if (
      !Number.isInteger(year) ||
      !fipeCode
    ) {
      continue
    }

    const key =
      `${fipeCode}:${year}`

    if (
      processed.has(key)
    ) {
      continue
    }

    processed.add(key)

    const result =
      await importVehicle(
        generation.id,
        price,
      )

    if (
      result === 'created'
    ) {
      created++
    } else {
      updated++
    }
  }

  return {
    models: 1,
    created,
    updated,
  }
}

async function main(): Promise<void> {
  const brandArg =
    getBrandArg()

  const limit =
    getLimit()

  console.log('')
  console.log(
    '==========================================',
  )
  console.log(
    '     IMPORTADOR TABELAFIPE.INFO',
  )
  console.log(
    '==========================================',
  )
  console.log('')

  const apiBrands =
    await getApiBrands()

  console.log(
    `Marcas disponíveis na API: ${apiBrands.length}`,
  )

  /*
   * Sem --brand:
   * importa TODAS as marcas retornadas
   * pela API.
   *
   * Com --brand:
   * importa somente a marca solicitada.
   */
  let selectedBrands: ApiBrand[]

  if (brandArg) {
    const selectedBrand =
      resolveBrand(
        brandArg,
        apiBrands,
      )

    if (!selectedBrand) {
      throw new Error(
        `Marca "${brandArg}" não foi encontrada na API.`,
      )
    }

    selectedBrands = [
      selectedBrand,
    ]
  } else {
    selectedBrands =
      apiBrands
  }

  let totalFamilies = 0
  let totalCreated = 0
  let totalUpdated = 0
  let totalSkippedBrands = 0

  for (
    const apiBrand of selectedBrands
  ) {
    console.log(
      `\n[MARCA] ${apiBrand.name}`,
    )

    let modelsData: ApiModelsResponse

    try {
      modelsData =
        await getJson<ApiModelsResponse>(
          `/carros/${apiBrand.slug}/modelos`,
        )
    } catch (error) {
      console.log(
        `  ⚠️ Não foi possível consultar modelos de ${apiBrand.name}. Marca ignorada.`,
      )

      totalSkippedBrands++

      continue
    }

    let families =
      modelsData.families ?? []

    if (limit) {
      families =
        families.slice(
          0,
          limit,
        )
    }

    console.log(
      `  Famílias: ${families.length}`,
    )

    for (
      const family of families
    ) {
      const result =
        await importFamily(
          apiBrand,
          family,
        )

      totalFamilies +=
        result.models

      totalCreated +=
        result.created

      totalUpdated +=
        result.updated

      console.log(
        `  ✓ ${family.name}: ${result.created} criados, ${result.updated} atualizados`,
      )

      /*
       * Mantemos aproximadamente
       * 57 requisições por minuto.
       */
      await sleep(1050)
    }
  }

  console.log('')
  console.log(
    '==========================================',
  )
  console.log(
    '          IMPORTAÇÃO FINAL',
  )
  console.log(
    '==========================================',
  )
  console.log(
    `Marcas processadas: ${selectedBrands.length}`,
  )
  console.log(
    `Famílias importadas: ${totalFamilies}`,
  )
  console.log(
    `Veículos criados: ${totalCreated}`,
  )
  console.log(
    `Veículos atualizados: ${totalUpdated}`,
  )
  console.log(
    `Marcas ignoradas: ${totalSkippedBrands}`,
  )
  console.log(
    '==========================================',
  )
  console.log('')
}

main().catch(
  (error) => {
    console.error('')
    console.error(
      'ERRO NA IMPORTAÇÃO:',
    )
    console.error(error)
    process.exit(1)
  },
)
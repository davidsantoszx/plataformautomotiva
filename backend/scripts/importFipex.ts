import 'dotenv/config';

import { DuckDBInstance } from '@duckdb/node-api';

import { db } from '../src/prisma/db.js';

const SOURCE = 'fipex';

const filePath =
  'data/catalog/fipex/dataset/fipex-prices-latest-merged.parquet';

const brands = [
  'VW - VolksWagen',
  'GM - Chevrolet',
  'Ford',
  'Fiat',
  'Mercedes-Benz',
  'Renault',
  'BMW',
  'Audi',
  'Peugeot',
  'Toyota',
  'Mitsubishi',
  'Citroën',
  'Hyundai',
  'Nissan',
  'Volvo',
  'Porsche',
  'Land Rover',
  'Honda',
  'Kia Motors',
  'Subaru',
  'Suzuki',
  'Jeep',
  'Jaguar',
  'Chery',
  'Caoa Chery',
  'JAC',
  'Lexus',
  'RAM',
  'Dodge',
  'Chrysler',
  'Mini',
  'BYD',
  'GWM',
  'MG',
  'Alfa Romeo',
  'Maserati',
  'Ferrari',
  'Lamborghini',
  'Bentley',
  'Aston Martin',
];

type ParsedModel = {
  model: string;
  version: string | null;
};

type FipeXRow = {
  nome_marca?: string;
  nome_modelo?: string;
  ano_modelo?: number | string;
  codigo_fipe?: string | number;
  combustivel?: string;
};

function getBrandArg(): string | null {
  const argument = process.argv.find((arg) =>
    arg.startsWith('--brand='),
  );

  if (!argument) {
    return null;
  }

  return argument
    .slice('--brand='.length)
    .trim()
    .toLowerCase();
}

function getLimit(): number | undefined {
  const argument = process.argv.find((arg) =>
    arg.startsWith('--limit='),
  );

  if (!argument) {
    return undefined;
  }

  const value = argument
    .slice('--limit='.length)
    .trim();

  const limit = Number.parseInt(value, 10);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(
      `Valor inválido para --limit: ${value}`,
    );
  }

  return limit;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-.]+\s*/, '')
    .trim();
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractModelAndVersion(
  nomeModelo: string,
): ParsedModel {
  const normalized = normalizeText(nomeModelo);

  if (!normalized) {
    return {
      model: '',
      version: null,
    };
  }

  const versionStart =
    /\b(?:\d+(?:[.,]\d+)(?:\s*(?:T|TB|TSI|TFSI|THP|TDI|HDi|GDI|MPI|MPFI|V6|V8|V10|V12))?|\d{3,5}\s*(?:CV|HP|CC)|[1-9]\d{2,4}\s*(?:CV|HP)|Turbo|Biturbo|Bi-Turbo|Flex|Diesel|Gasolina|Elétrico|Electric|Hybrid|Híbrido|Plug-in|PHEV|MHEV|HEV|Aut\.|Automático|Automatizado|Manual|CVT|DCT|AMT|4x4|4WD|AWD|FWD|RWD)\b/i;

  const match = normalized.match(versionStart);

  if (
    match &&
    match.index !== undefined
  ) {
    const before = normalized
      .slice(0, match.index)
      .trim();

    const after = normalized
      .slice(match.index)
      .trim();

    if (before) {
      return {
        model: before,
        version: after || null,
      };
    }
  }

  return {
    model: normalized,
    version: null,
  };
}

function parseYear(
  value: number | string | undefined,
): number | undefined {
  const year = Number.parseInt(
    String(value ?? ''),
    10,
  );

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2100
  ) {
    return undefined;
  }

  return year;
}

function normalizeFuel(
  value: string | undefined,
): string | undefined {
  const fuel = value?.trim();

  return fuel || undefined;
}

async function getRows(
  connection: Awaited<
    ReturnType<
      Awaited<
        ReturnType<
          typeof DuckDBInstance.create
        >
      >['connect']
    >
  >,
  selectedBrands: string[],
): Promise<FipeXRow[]> {
  const brandList = selectedBrands
    .map(
      (brand) =>
        `'${brand.replace(/'/g, "''")}'`,
    )
    .join(', ');

  const result = await connection.runAndReadAll(`
    SELECT
      nome_marca,
      nome_modelo,
      ano_modelo,
      codigo_fipe
    FROM read_parquet('${filePath}')
    WHERE tipo_veiculo = 'carro'
      AND nome_marca IN (${brandList})
      AND ano_modelo IS NOT NULL
      AND codigo_fipe IS NOT NULL
    GROUP BY
      nome_marca,
      nome_modelo,
      ano_modelo,
      codigo_fipe
    ORDER BY
      nome_marca,
      nome_modelo,
      ano_modelo,
      codigo_fipe
  `);

  return result.getRowObjects() as FipeXRow[];
}

async function importBrand(
  brandName: string,
) {
  const name = normalizeText(brandName);
  const slug = slugify(name);

  let localBrand =
    await db.orm.public.CarBrand.first({
      slug,
    });

  if (!localBrand) {
    localBrand =
      await db.orm.public.CarBrand.create({
        name,
        slug,
      });

    console.log(`  + Marca: ${name}`);
  } else if (localBrand.name !== name) {
    await db.orm.public.CarBrand
      .where({
        id: localBrand.id,
      })
      .update({
        name,
      });
  }

  return localBrand;
}

async function importModel(
  brandId: number,
  modelName: string,
) {
  const name = normalizeText(modelName);
  const slug = slugify(name);

  let localModel =
    await db.orm.public.CarModel.first({
      brandId,
      slug,
    });

  if (!localModel) {
    localModel =
      await db.orm.public.CarModel.create({
        brandId,
        name,
        slug,
      });

    console.log(`    + Modelo: ${name}`);
  } else if (localModel.name !== name) {
    await db.orm.public.CarModel
      .where({
        id: localModel.id,
      })
      .update({
        name,
      });
  }

  return localModel;
}

async function importGeneration(
  modelId: number,
  modelName: string,
  years: number[],
) {
  if (years.length === 0) {
    return null;
  }

  const yearStart = Math.min(...years);
  const yearEnd = Math.max(...years);

  const generationName =
    `${modelName} - fipeX`;

  let generation =
    await db.orm.public.CarGeneration.first({
      modelId,
      name: generationName,
    });

  if (!generation) {
    generation =
      await db.orm.public.CarGeneration.create({
        modelId,
        name: generationName,
        yearStart,
        yearEnd,
      });

    console.log(
      `      + Agrupamento interno: ${generationName} (${yearStart}-${yearEnd})`,
    );
  } else if (
    generation.yearStart !== yearStart ||
    generation.yearEnd !== yearEnd
  ) {
    await db.orm.public.CarGeneration
      .where({
        id: generation.id,
      })
      .update({
        yearStart,
        yearEnd,
      });
  }

  return generation;
}

function buildExternalId(
  codigoFipe: string | number,
  year: number,
): string {
  return `${String(codigoFipe).trim()}:${year}`;
}

async function importVehicle(
  generationId: number,
  codigoFipe: string | number,
  year: number,
  version: string | null,
) {
  const versionName =
    version?.trim() || 'Versão não identificada';

  const externalId =
    buildExternalId(
      codigoFipe,
      year,
    );

  let vehicle =
    await db.orm.public.Vehicle.first({
      source: SOURCE,
      externalId,
    });

  if (vehicle) {
    await db.orm.public.Vehicle
      .where({
        id: vehicle.id,
      })
      .update({
        generationId,
        year,
        version: versionName,
      });

    return 'updated';
  }

  const existingVehicle =
    await db.orm.public.Vehicle.first({
      generationId,
      year,
      version: versionName,
    });

  if (existingVehicle) {
    if (existingVehicle.source === SOURCE) {
      await db.orm.public.Vehicle
        .where({
          id: existingVehicle.id,
        })
        .update({
          externalId,
        });

      return 'updated';
    }

    console.log(
      `      ! Conflito preservado: ${year} ${versionName} (vehicle ${existingVehicle.id})`,
    );

    return 'conflict';
  }

  await db.orm.public.Vehicle.create({
    generationId,
    year,
    version: versionName,
    source: SOURCE,
    externalId,
  });

  return 'created';
}

async function main(): Promise<void> {
  const brandArg = getBrandArg();
  const limit = getLimit();

  console.log('');
  console.log('==========================================');
  console.log('       IMPORTADOR DE CATÁLOGO FIPEX');
  console.log('==========================================');
  console.log('');

  const selectedBrands = brandArg
    ? brands.filter(
        (brand) =>
          brand.toLowerCase() === brandArg,
      )
    : brands;

  if (
    brandArg &&
    selectedBrands.length === 0
  ) {
    throw new Error(
      `Marca "${brandArg}" não está entre as 40 marcas selecionadas.`,
    );
  }

  if (brandArg) {
    console.log(
      `Marca selecionada: ${selectedBrands[0]}`,
    );
  } else {
    console.log(
      `Marcas selecionadas: ${selectedBrands.length}`,
    );
  }

  if (limit) {
    console.log(
      `Limite de registros: ${limit}`,
    );
  }

  console.log('');

  const instance =
    await DuckDBInstance.create(':memory:');

  const connection =
    await instance.connect();

  let rows = await getRows(
    connection,
    selectedBrands,
  );

  connection.closeSync();
  instance.closeSync();

  if (limit) {
    rows = rows.slice(0, limit);
  }

  console.log(
    `Registros fipeX selecionados: ${rows.length}`,
  );

  const parsedRows = rows
    .map((row) => {
      const brand = normalizeText(
        String(row.nome_marca ?? ''),
      );

      const original = normalizeText(
        String(row.nome_modelo ?? ''),
      );

      const year = parseYear(
        row.ano_modelo,
      );

      const codigoFipe = String(
        row.codigo_fipe ?? '',
      ).trim();

      if (
        !brand ||
        !original ||
        !year ||
        !codigoFipe
      ) {
        return null;
      }

      const parsed =
        extractModelAndVersion(
          original,
        );

      if (!parsed.model) {
        return null;
      }

      return {
        brand,
        original,
        model: parsed.model,
        version: parsed.version,
        year,
        codigoFipe,
      };
    })
    .filter(
      (
        row,
      ): row is {
        brand: string;
        original: string;
        model: string;
        version: string | null;
        year: number;
        codigoFipe: string;
      } => row !== null,
    );

  const brandsMap =
    new Map<string, typeof parsedRows>();

  for (const row of parsedRows) {
    const current =
      brandsMap.get(row.brand) ?? [];

    current.push(row);

    brandsMap.set(
      row.brand,
      current,
    );
  }

  let totalModels = 0;
  let totalVehiclesCreated = 0;
  let totalVehiclesUpdated = 0;
  let totalConflicts = 0;

  for (
    const [brandName, brandRows]
    of brandsMap
  ) {
    console.log(`\n[MARCA] ${brandName}`);

    const localBrand =
      await importBrand(brandName);

    const modelsMap =
      new Map<string, typeof brandRows>();

    for (const row of brandRows) {
      const current =
        modelsMap.get(row.model) ?? [];

      current.push(row);

      modelsMap.set(
        row.model,
        current,
      );
    }

    console.log(
      `  Modelos encontrados: ${modelsMap.size}`,
    );

    for (
      const [modelName, modelRows]
      of modelsMap
    ) {
      const localModel =
        await importModel(
          localBrand.id,
          modelName,
        );

      const years = [
        ...new Set(
          modelRows.map(
            (row) => row.year,
          ),
        ),
      ].sort(
        (a, b) => a - b,
      );

      const generation =
        await importGeneration(
          localModel.id,
          modelName,
          years,
        );

      if (!generation) {
        continue;
      }

      totalModels++;

      const vehicleKeys =
        new Set<string>();

      for (const row of modelRows) {
        const key =
          `${row.codigoFipe}:${row.year}`;

        if (vehicleKeys.has(key)) {
          continue;
        }

        vehicleKeys.add(key);

        const result =
          await importVehicle(
            generation.id,
            row.codigoFipe,
            row.year,
            row.version,
          );

        if (result === 'created') {
          totalVehiclesCreated++;
        }

        if (result === 'updated') {
          totalVehiclesUpdated++;
        }

        if (result === 'conflict') {
          totalConflicts++;
        }
      }
    }
  }


  
  console.log('');
  console.log('==========================================');
  console.log('             IMPORTAÇÃO FINAL');
  console.log('==========================================');
  console.log(
    `Marcas processadas: ${brandsMap.size}`,
  );
  console.log(
    `Modelos processados: ${totalModels}`,
  );
  console.log(
    `Veículos criados: ${totalVehiclesCreated}`,
  );
  console.log(
    `Veículos atualizados: ${totalVehiclesUpdated}`,
  );
  console.log(
    `Conflitos preservados: ${totalConflicts}`,
  );
  console.log('==========================================');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('ERRO NA IMPORTAÇÃO:');
  console.error(error);
  process.exit(1);
});
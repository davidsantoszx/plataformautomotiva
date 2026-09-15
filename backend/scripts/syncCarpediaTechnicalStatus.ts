import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { db } from '../src/prisma/db.js';

const SOURCE = 'carpedia';

const CACHE_DIR = path.resolve(
  process.cwd(),
  'data/catalog/carpedia/fichas',
);

const STATUS_FILE = path.join(
  CACHE_DIR,
  'status.json',
);

type ImportStatus = {
  status: 'success';
  fipeId: number;
  year: number;
  vehicleId: number;
  updatedAt: string;
};

type ImportStatusMap =
  Record<string, ImportStatus>;

function hasTechnicalData(
  vehicle: Record<string, unknown>,
): boolean {
  const fields = [
    'engine',
    'transmission',
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
  ];

  return fields.some(
    (field) =>
      vehicle[field] !== undefined &&
      vehicle[field] !== null &&
      vehicle[field] !== '',
  );
}

function parseExternalId(
  externalId: string,
): {
  fipeId: number;
  year: number;
} | undefined {
  const separatorIndex =
    externalId.lastIndexOf(':');

  if (separatorIndex === -1) {
    return undefined;
  }

  const fipeId = Number.parseInt(
    externalId.slice(
      0,
      separatorIndex,
    ),
    10,
  );

  const year = Number.parseInt(
    externalId.slice(
      separatorIndex + 1,
    ),
    10,
  );

  if (
    !Number.isFinite(fipeId) ||
    !Number.isFinite(year)
  ) {
    return undefined;
  }

  return {
    fipeId,
    year,
  };
}

async function main(): Promise<void> {
  console.log('');
  console.log('==========================================');
  console.log('   SINCRONIZAÇÃO STATUS CARPEDIA');
  console.log('==========================================');
  console.log('');

  const vehicles =
    await db.orm.public.Vehicle
      .where({
        source: SOURCE,
      })
      .all();

  const statusMap: ImportStatusMap = {};

  let synchronized = 0;
  let withoutTechnicalData = 0;
  let invalidExternalId = 0;

  for (const vehicle of vehicles) {
    const vehicleData =
      vehicle as unknown as Record<
        string,
        unknown
      >;

    if (!hasTechnicalData(vehicleData)) {
      withoutTechnicalData++;
      continue;
    }

    if (!vehicle.externalId) {
      invalidExternalId++;
      continue;
    }

    const parsed = parseExternalId(
      vehicle.externalId,
    );

    if (!parsed) {
      invalidExternalId++;
      continue;
    }

    const { fipeId, year } = parsed;

    const statusKey =
      `${fipeId}:${year}`;

    statusMap[statusKey] = {
      status: 'success',
      fipeId,
      year,
      vehicleId: vehicle.id,
      updatedAt:
        new Date().toISOString(),
    };

    synchronized++;
  }

  await mkdir(CACHE_DIR, {
    recursive: true,
  });

  await writeFile(
    STATUS_FILE,
    JSON.stringify(
      statusMap,
      null,
      2,
    ),
    'utf8',
  );

  console.log(
    `Veículos analisados: ${vehicles.length}`,
  );

  console.log(
    `Status sincronizados: ${synchronized}`,
  );

  console.log(
    `Sem dados técnicos: ${withoutTechnicalData}`,
  );

  console.log(
    `IDs inválidos: ${invalidExternalId}`,
  );

  console.log('');
  console.log(
    `Arquivo criado: ${STATUS_FILE}`,
  );

  console.log('');
  console.log('==========================================');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('ERRO FATAL:');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});
import 'dotenv/config';

import { readFile } from 'node:fs/promises';
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

type ImportStatusType =
  | 'success'
  | 'not_found'
  | 'error';

interface ImportStatus {
  status: ImportStatusType;
  fipeId: number;
  year: number;
  vehicleId: number;
  updatedAt: string;
  message?: string;
}

type ImportStatusMap = Record<string, ImportStatus>;

async function loadStatus(): Promise<ImportStatusMap> {
  try {
    const content = await readFile(
      STATUS_FILE,
      'utf8',
    );

    return JSON.parse(
      content,
    ) as ImportStatusMap;
  } catch {
    return {};
  }
}

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

async function main(): Promise<void> {
  console.log('');
  console.log('==========================================');
  console.log('       STATUS CATÁLOGO CARPEDIA');
  console.log('==========================================');
  console.log('');

  const vehicles =
    await db.orm.public.Vehicle
      .where({
        source: SOURCE,
      })
      .all();

  const statusMap =
    await loadStatus();

  let withTechnicalData = 0;
  let withoutTechnicalData = 0;

  let success = 0;
  let notFound = 0;
  let errors = 0;
  let pending = 0;

  for (const vehicle of vehicles) {
    const vehicleData =
      vehicle as unknown as Record<
        string,
        unknown
      >;

    if (hasTechnicalData(vehicleData)) {
      withTechnicalData++;
    } else {
      withoutTechnicalData++;
    }

    if (!vehicle.externalId) {
      continue;
    }

    const separatorIndex =
      vehicle.externalId.lastIndexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const fipeId = Number.parseInt(
      vehicle.externalId.slice(
        0,
        separatorIndex,
      ),
      10,
    );

    const year = Number.parseInt(
      vehicle.externalId.slice(
        separatorIndex + 1,
      ),
      10,
    );

    if (
      !Number.isFinite(fipeId) ||
      !Number.isFinite(year)
    ) {
      continue;
    }

    const statusKey = `${fipeId}:${year}`;

    const status = statusMap[statusKey];

    if (!status) {
      pending++;
    } else if (status.status === 'success') {
      success++;
    } else if (status.status === 'not_found') {
      notFound++;
    } else if (status.status === 'error') {
      errors++;
    }
  }

  console.log(
    `Total de veículos: ${vehicles.length}`,
  );

  console.log('');
  console.log('DADOS TÉCNICOS');
  console.log('------------------------------------------');
  console.log(
    `Com ficha:    ${withTechnicalData}`,
  );
  console.log(
    `Sem ficha:    ${withoutTechnicalData}`,
  );

  console.log('');
  console.log('STATUS DAS CONSULTAS');
  console.log('------------------------------------------');
  console.log(
    `Sucesso:      ${success}`,
  );
  console.log(
    `404:          ${notFound}`,
  );
  console.log(
    `Erros:        ${errors}`,
  );
  console.log(
    `Pendentes:    ${pending}`,
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
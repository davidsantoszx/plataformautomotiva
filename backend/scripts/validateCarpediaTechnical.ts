import 'dotenv/config';

import { db } from '../src/prisma/db.js';

const SOURCE = 'carpedia';

const TECHNICAL_FIELDS = [
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
] as const;

type TechnicalField =
  (typeof TECHNICAL_FIELDS)[number];

function hasValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== ''
  );
}

function percentage(
  value: number,
  total: number,
): string {
  if (total === 0) {
    return '0.0%';
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  console.log('');
  console.log('==========================================');
  console.log('       VALIDAÇÃO CATÁLOGO CARPEDIA');
  console.log('==========================================');
  console.log('');

  const vehicles =
    await db.orm.public.Vehicle
      .where({
        source: SOURCE,
      })
      .all();

  const total = vehicles.length;

  let vehiclesWithTechnicalData = 0;
  let vehiclesWithoutTechnicalData = 0;

  const fieldCounts:
    Record<TechnicalField, number> =
      Object.fromEntries(
        TECHNICAL_FIELDS.map(
          (field) => [field, 0],
        ),
      ) as Record<
        TechnicalField,
        number
      >;

  for (const vehicle of vehicles) {
    let fieldsFilled = 0;

    for (const field of TECHNICAL_FIELDS) {
      if (hasValue(vehicle[field])) {
        fieldCounts[field]++;
        fieldsFilled++;
      }
    }

    if (fieldsFilled > 0) {
      vehiclesWithTechnicalData++;
    } else {
      vehiclesWithoutTechnicalData++;
    }
  }

  console.log(
    `Total de veículos: ${total}`,
  );

  console.log(
    `Com dados da ficha: ${vehiclesWithTechnicalData} (${percentage(
      vehiclesWithTechnicalData,
      total,
    )})`,
  );

  console.log(
    `Sem dados da ficha: ${vehiclesWithoutTechnicalData} (${percentage(
      vehiclesWithoutTechnicalData,
      total,
    )})`,
  );

  console.log('');
  console.log('COBERTURA DA FICHA TÉCNICA');
  console.log('------------------------------------------');

  const labels:
    Record<TechnicalField, string> = {
    engine: 'Motor',
    transmission: 'Câmbio',
    bodyType: 'Carroceria',
    drivetrain: 'Tração',
    doors: 'Portas',
    seats: 'Lugares',
    displacementCc: 'Cilindrada',
    powerHp: 'Potência',
    torqueNm: 'Torque',
    lengthMm: 'Comprimento',
    widthMm: 'Largura',
    heightMm: 'Altura',
    wheelbaseMm: 'Entre-eixos',
    weightKg: 'Peso',
    consumptionCity: 'Consumo cidade',
    consumptionHighway: 'Consumo estrada',
  };

  for (const field of TECHNICAL_FIELDS) {
    const count = fieldCounts[field];

    console.log(
      `${labels[field].padEnd(20)} ${String(
        count,
      ).padStart(4)} / ${total} (${percentage(
        count,
        total,
      )})`,
    );
  }

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
import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { db } from '../src/prisma/db.js';
import { carpediaClient } from '../data/catalog/carpedia/carpedia.client.js';

import type {
  CarpediaFichaResponse,
  CarpediaFichaItem,
} from '../data/catalog/carpedia/carpedia.type.js';

const SOURCE = 'carpedia';

const CACHE_DIR = path.resolve(
  process.cwd(),
  'data/catalog/carpedia/fichas',
);

const STATUS_FILE = path.join(
  CACHE_DIR,
  'status.json',
);

const KGFM_TO_NM = 9.80665;
const LBFT_TO_NM = 1.35581795;

interface NormalizedVehicleData {
  engine?: string;
  transmission?: string;
  fuel?: string;
  bodyType?: string;
  drivetrain?: string;

  doors?: number;
  seats?: number;

  displacementCc?: number;
  powerHp?: number;
  torqueNm?: number;

  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  wheelbaseMm?: number;
  weightKg?: number;

  consumptionCity?: number;
  consumptionHighway?: number;
}

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

function getArg(name: string): string | undefined {
  const argument = process.argv.find((arg) =>
    arg.startsWith(`--${name}=`),
  );

  return argument?.split('=').slice(1).join('=');
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getLimit(): number | undefined {
  const value = getArg('limit');

  if (!value) {
    return undefined;
  }

  const limit = Number.parseInt(value, 10);

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`Valor inválido para --limit: ${value}`);
  }

  return limit;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumber(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .replace(/\s/g, '')
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')
    .replace(',', '.');

  const match = cleaned.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const number = Number.parseFloat(match[0]);

  return Number.isFinite(number) ? number : undefined;
}

function parseInteger(value: string): number | undefined {
  const number = parseNumber(value);

  if (number === undefined) {
    return undefined;
  }

  return Math.round(number);
}

function parseMeasurement(
  value: string,
  targetUnit: 'mm' | 'kg',
): number | undefined {
  const normalized = normalizeText(value);
  const number = parseNumber(value);

  if (number === undefined) {
    return undefined;
  }

  if (targetUnit === 'mm') {
    if (normalized.includes('cm')) {
      return Math.round(number * 10);
    }

    if (
      normalized.includes(' m') ||
      normalized.endsWith('m')
    ) {
      return Math.round(number * 1000);
    }

    return Math.round(number);
  }

  if (normalized.includes('t')) {
    return Math.round(number * 1000);
  }

  return Math.round(number);
}

function parsePower(value: string): number | undefined {
  const normalized = normalizeText(value);
  const number = parseNumber(value);

  if (number === undefined) {
    return undefined;
  }

  if (normalized.includes('kw')) {
    return number * 1.34102209;
  }

  return number;
}

function parseTorque(value: string): number | undefined {
  const normalized = normalizeText(value);
  const number = parseNumber(value);

  if (number === undefined) {
    return undefined;
  }

  if (
    normalized.includes('kgfm') ||
    normalized.includes('kgf.m') ||
    normalized.includes('kgf m') ||
    normalized.includes('mkgf') ||
    normalized.includes('mkg')
  ) {
    return number * KGFM_TO_NM;
  }

  if (
    normalized.includes('lb-ft') ||
    normalized.includes('lbft') ||
    normalized.includes('lb ft')
  ) {
    return number * LBFT_TO_NM;
  }

  return number;
}

function parseDisplacement(value: string): number | undefined {
  const normalized = normalizeText(value);
  const number = parseNumber(value);

  if (number === undefined) {
    return undefined;
  }

  if (
    normalized.includes('cm3') ||
    normalized.includes('cm³') ||
    normalized.includes('cc')
  ) {
    return Math.round(number);
  }

  if (
    normalized.includes('litro') ||
    normalized.includes('litros')
  ) {
    return Math.round(number * 1000);
  }

  if (
    normalized.endsWith('l') &&
    !normalized.includes('ml')
  ) {
    return Math.round(number * 1000);
  }

  return Math.round(number);
}

function findItem(
  items: CarpediaFichaItem[],
  predicates: string[],
): CarpediaFichaItem | undefined {
  return items.find((item) => {
    const label = normalizeText(item.label);

    return predicates.some((predicate) =>
      label.includes(predicate),
    );
  });
}

function getAllItems(
  ficha: CarpediaFichaResponse,
): CarpediaFichaItem[] {
  return ficha.secoes.flatMap((secao) => secao.itens);
}

function normalizeFicha(
  ficha: CarpediaFichaResponse,
): NormalizedVehicleData {
  const items = getAllItems(ficha);

  const data: NormalizedVehicleData = {};

  const engine = findItem(items, [
    'motor',
    'motorizacao',
  ]);

  if (engine) {
    data.engine = engine.valor.trim();
  }

  const transmission = findItem(items, [
    'cambio',
    'transmissao',
  ]);

  if (transmission) {
    data.transmission = transmission.valor.trim();
  }

  const fuel = findItem(items, [
    'combustivel',
    'combustiveis',
  ]);

  if (fuel) {
    data.fuel = fuel.valor.trim();
  }

  const bodyType = findItem(items, [
    'carroceria',
    'tipo de carroceria',
  ]);

  if (bodyType) {
    data.bodyType = bodyType.valor.trim();
  } else if (ficha.porte?.carroceria) {
    data.bodyType = ficha.porte.carroceria.trim();
  }

  const drivetrain = findItem(items, [
    'tracao',
  ]);

  if (drivetrain) {
    data.drivetrain = drivetrain.valor.trim();
  }

  const doors = findItem(items, [
    'portas',
  ]);

  if (doors) {
    data.doors = parseInteger(doors.valor);
  }

  const seats = findItem(items, [
    'lugares',
    'assentos',
    'ocupantes',
  ]);

  if (seats) {
    data.seats = parseInteger(seats.valor);
  }

  const displacement = findItem(items, [
    'cilindrada',
    'deslocamento',
  ]);

  if (displacement) {
    data.displacementCc = parseDisplacement(
      displacement.valor,
    );
  }

  const power = findItem(items, [
    'potencia',
  ]);

  if (power) {
    data.powerHp = parsePower(power.valor);
  }

  const torque = findItem(items, [
    'torque',
  ]);

  if (torque) {
    data.torqueNm = parseTorque(torque.valor);
  }

  const length = findItem(items, [
    'comprimento',
  ]);

  if (length) {
    data.lengthMm = parseMeasurement(
      length.valor,
      'mm',
    );
  }

  const width = findItem(items, [
    'largura',
  ]);

  if (width) {
    data.widthMm = parseMeasurement(
      width.valor,
      'mm',
    );
  }

  const height = findItem(items, [
    'altura',
  ]);

  if (height) {
    data.heightMm = parseMeasurement(
      height.valor,
      'mm',
    );
  }

  const wheelbase = findItem(items, [
    'entre-eixos',
    'entre eixos',
    'distancia entre eixos',
  ]);

  if (wheelbase) {
    data.wheelbaseMm = parseMeasurement(
      wheelbase.valor,
      'mm',
    );
  }

  const weight = findItem(items, [
    'peso',
    'massa',
  ]);

  if (weight) {
    data.weightKg = parseMeasurement(
      weight.valor,
      'kg',
    );
  }

  if (
    ficha.porte?.comprimento_mm &&
    !data.lengthMm
  ) {
    data.lengthMm = ficha.porte.comprimento_mm;
  }

  if (ficha.consumo) {
    if (
      ficha.consumo.kml_cidade !== undefined
    ) {
      data.consumptionCity =
        ficha.consumo.kml_cidade;
    }

    if (
      ficha.consumo.kml_estrada !== undefined
    ) {
      data.consumptionHighway =
        ficha.consumo.kml_estrada;
    }
  }

  return data;
}

function getCachePath(
  fipeId: number,
  year: number,
): string {
  return path.join(
    CACHE_DIR,
    `${fipeId}_${year}.json`,
  );
}

async function loadCachedFicha(
  fipeId: number,
  year: number,
): Promise<CarpediaFichaResponse | undefined> {
  const cachePath = getCachePath(
    fipeId,
    year,
  );

  try {
    const content = await readFile(
      cachePath,
      'utf8',
    );

    return JSON.parse(
      content,
    ) as CarpediaFichaResponse;
  } catch {
    return undefined;
  }
}

async function saveFichaCache(
  fipeId: number,
  year: number,
  ficha: CarpediaFichaResponse,
): Promise<void> {
  await mkdir(CACHE_DIR, {
    recursive: true,
  });

  const cachePath = getCachePath(
    fipeId,
    year,
  );

  await writeFile(
    cachePath,
    JSON.stringify(ficha, null, 2),
    'utf8',
  );
}

async function loadStatus(): Promise<ImportStatusMap> {
  try {
    const content = await readFile(
      STATUS_FILE,
      'utf8',
    );

    return JSON.parse(content) as ImportStatusMap;
  } catch {
    return {};
  }
}

async function saveStatus(
  statusMap: ImportStatusMap,
): Promise<void> {
  await mkdir(CACHE_DIR, {
    recursive: true,
  });

  await writeFile(
    STATUS_FILE,
    JSON.stringify(statusMap, null, 2),
    'utf8',
  );
}

function getStatusKey(
  fipeId: number,
  year: number,
): string {
  return `${fipeId}:${year}`;
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
    externalId.slice(0, separatorIndex),
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
  const limit = getLimit();
  const refresh = hasFlag('refresh');
  const debug = hasFlag('debug');
  const retryNotFound =
    hasFlag('retry-not-found');

  console.log('');
  console.log('==========================================');
  console.log('   IMPORTADOR DE FICHA TÉCNICA CARPEDIA');
  console.log('==========================================');
  console.log('');

  if (limit) {
    console.log(
      `Limite de veículos: ${limit}`,
    );
  } else {
    console.log(
      'Limite de veículos: todos',
    );
  }

  console.log(
    `Modo cache: ${
      refresh
        ? 'ATUALIZAR API'
        : 'USAR CACHE'
    }`,
  );

  console.log(
    `Repetir 404: ${
      retryNotFound ? 'SIM' : 'NÃO'
    }`,
  );

  console.log('');

  let vehicles =
    await db.orm.public.Vehicle
      .where({
        source: SOURCE,
      })
      .all();

  if (limit) {
    vehicles = vehicles.slice(0, limit);
  }

  console.log(
    `Veículos Carpedia selecionados: ${vehicles.length}`,
  );
  console.log('');

  const statusMap =
    await loadStatus();

  let apiRequests = 0;
  let cacheHits = 0;
  let statusSuccess = 0;
  let statusNotFound = 0;
  let statusErrors = 0;
  let updated = 0;
  let noFicha = 0;
  let invalidExternalId = 0;
  let errors = 0;
  let skippedAlreadyProcessed = 0;

  for (const vehicle of vehicles) {
    if (!vehicle.externalId) {
      invalidExternalId++;
      continue;
    }

    const parsed = parseExternalId(
      vehicle.externalId,
    );

    if (!parsed) {
      invalidExternalId++;

      console.log(
        `[IGNORADO] externalId inválido: ${vehicle.externalId}`,
      );

      continue;
    }

    const { fipeId, year } = parsed;
    const statusKey = getStatusKey(
      fipeId,
      year,
    );

    console.log(
      `[VEÍCULO] ${
        vehicle.version ?? 'Sem versão'
      } - ${year}`,
    );

    let ficha:
      | CarpediaFichaResponse
      | undefined;

    const existingStatus =
      statusMap[statusKey];

    if (
      existingStatus?.status === 'success' &&
      !refresh
    ) {
      ficha = await loadCachedFicha(
        fipeId,
        year,
      );

      if (ficha) {
        cacheHits++;
        skippedAlreadyProcessed++;

        console.log(
          '  > Já processado: cache utilizado',
        );
      }
    }

    if (
      existingStatus?.status === 'not_found' &&
      !retryNotFound &&
      !refresh
    ) {
      skippedAlreadyProcessed++;
      statusNotFound++;

      console.log(
        '  > Ignorado: ficha anteriormente marcada como 404',
      );

      continue;
    }

    if (!ficha && !refresh) {
      ficha = await loadCachedFicha(
        fipeId,
        year,
      );

      if (ficha) {
        cacheHits++;

        console.log(
          '  > Ficha encontrada no cache',
        );
      }
    }

    if (!ficha) {
      try {
        console.log(
          `  > Consultando Carpedia: ficha/${fipeId}/${year}`,
        );

        ficha =
          await carpediaClient.getTechnicalSheet(
            fipeId,
            year,
          );

        apiRequests++;

        await saveFichaCache(
          fipeId,
          year,
          ficha,
        );

        statusMap[statusKey] = {
          status: 'success',
          fipeId,
          year,
          vehicleId: vehicle.id,
          updatedAt:
            new Date().toISOString(),
        };

        await saveStatus(statusMap);

        statusSuccess++;

        console.log(
          '  > Ficha salva no cache',
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        if (message.includes('404')) {
          noFicha++;

          statusMap[statusKey] = {
            status: 'not_found',
            fipeId,
            year,
            vehicleId: vehicle.id,
            updatedAt:
              new Date().toISOString(),
            message,
          };

          await saveStatus(statusMap);

          statusNotFound++;

          console.log(
            '  > Ficha técnica não disponível',
          );
        } else {
          errors++;

          statusMap[statusKey] = {
            status: 'error',
            fipeId,
            year,
            vehicleId: vehicle.id,
            updatedAt:
              new Date().toISOString(),
            message,
          };

          await saveStatus(statusMap);

          statusErrors++;

          console.log(
            `  > Erro: ${message}`,
          );
        }

        continue;
      }
    }

    const normalized =
      normalizeFicha(ficha);

    if (debug) {
      console.log(
        '  > Dados normalizados:',
      );

      console.log(
        JSON.stringify(
          normalized,
          null,
          2,
        ),
      );
    }

    const updateData:
      Record<string, unknown> = {};

    for (
      const [key, value]
      of Object.entries(normalized)
    ) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        updateData[key] = value;
      }
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      console.log(
        '  > Nenhum campo técnico reconhecido',
      );

      continue;
    }

    await db.orm.public.Vehicle
      .where({
        id: vehicle.id,
      })
      .update(updateData);

    updated++;

    console.log(
      `  + ${
        Object.keys(updateData).length
      } campos atualizados`,
    );
  }

  console.log('');
  console.log('==========================================');
  console.log('             IMPORTAÇÃO FINAL');
  console.log('==========================================');
  console.log(
    `Selecionados: ${vehicles.length}`,
  );
  console.log(
    `Consultas à API: ${apiRequests}`,
  );
  console.log(
    `Cache utilizado: ${cacheHits}`,
  );
  console.log(
    `Já processados ignorados: ${skippedAlreadyProcessed}`,
  );
  console.log(
    `Sucessos registrados: ${statusSuccess}`,
  );
  console.log(
    `404 registrados: ${statusNotFound}`,
  );
  console.log(
    `Erros registrados: ${statusErrors}`,
  );
  console.log(
    `Veículos atualizados: ${updated}`,
  );
  console.log(
    `Sem ficha nesta execução: ${noFicha}`,
  );
  console.log(
    `IDs inválidos: ${invalidExternalId}`,
  );
  console.log(
    `Erros nesta execução: ${errors}`,
  );
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
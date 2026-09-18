import { DuckDBInstance } from "@duckdb/node-api";

const filePath =
  "data/catalog/fipex/dataset/fipex-prices-latest-merged.parquet";

const brands = [
  "VW - VolksWagen",
  "GM - Chevrolet",
  "Ford",
  "Fiat",
  "Mercedes-Benz",
  "Renault",
  "BMW",
  "Audi",
  "Peugeot",
  "Toyota",
  "Mitsubishi",
  "Citroën",
  "Hyundai",
  "Nissan",
  "Volvo",
  "Porsche",
  "Land Rover",
  "Honda",
  "Kia Motors",
  "Subaru",
  "Suzuki",
  "Jeep",
  "Jaguar",
  "Chery",
  "Caoa Chery",
  "JAC",
  "Lexus",
  "RAM",
  "Dodge",
  "Chrysler",
  "Mini",
  "BYD",
  "GWM",
  "MG",
  "Alfa Romeo",
  "Maserati",
  "Ferrari",
  "Lamborghini",
  "Bentley",
  "Aston Martin",
];

type ParsedModel = {
  model: string;
  version: string | null;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-.]+\s*/, "")
    .trim();
}

function extractModelAndVersion(nomeModelo: string): ParsedModel {
  const normalized = normalizeText(nomeModelo);

  if (!normalized) {
    return {
      model: "",
      version: null,
    };
  }

  /*
   * O começo do nome representa o MODELO.
   * A partir do primeiro indicador técnico claro começa a VERSÃO.
   *
   * Não existe lista de modelos por marca.
   */

  const versionStart =
    /\b(?:\d+(?:[.,]\d+)(?:\s*(?:T|TB|TSI|TFSI|THP|TDI|HDi|GDI|MPI|MPFI|V6|V8|V10|V12))?|\d{3,5}\s*(?:CV|HP|CC)|[1-9]\d{2,4}\s*(?:CV|HP)|Turbo|Biturbo|Bi-Turbo|Flex|Diesel|Gasolina|Elétrico|Electric|Hybrid|Híbrido|Plug-in|PHEV|MHEV|HEV|Aut\.|Automático|Automatizado|Manual|CVT|DCT|AMT|4x4|4WD|AWD|FWD|RWD)\b/i;

  const match = normalized.match(versionStart);

  if (match && match.index !== undefined) {
    const before = normalized.slice(0, match.index).trim();
    const after = normalized.slice(match.index).trim();

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

async function main() {
  const db = await DuckDBInstance.create();
  const conn = await db.connect();

  const brandList = brands
    .map((brand) => `'${brand.replace(/'/g, "''")}'`)
    .join(", ");

  const query = `
    SELECT
      nome_marca,
      nome_modelo
    FROM read_parquet('${filePath}')
    WHERE nome_marca IN (${brandList})
    GROUP BY nome_marca, nome_modelo
    ORDER BY nome_marca, nome_modelo
  `;

  const result = await conn.run(query);
  const rows = await result.getRowObjects();

  const parsed: Array<{
    marca: string;
    original: string;
    model: string;
    version: string | null;
  }> = rows.map((row) => {
    const marca = String(row.nome_marca ?? "");
    const original = String(row.nome_modelo ?? "");

    const parsedModel = extractModelAndVersion(original);

    return {
      marca,
      original,
      model: parsedModel.model,
      version: parsedModel.version,
    };
  });

  const combinations = new Set(
    parsed.map(
      (item) =>
        `${item.marca} | ${item.model} | ${item.version ?? ""}`,
    ),
  );

  console.log(`TOTAL DE COMBINAÇÕES: ${combinations.size}`);

  console.log("\n=== AMOSTRAS ===");

  parsed.slice(0, 30).forEach((item) => {
    console.log(
      `${item.marca} | ${item.original} => ${item.model} | ${item.version ?? "-"}`,
    );
  });

  console.log("\nFIM");

  conn.closeSync();
  db.closeSync();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
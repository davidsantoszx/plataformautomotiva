import { DuckDBInstance } from "@duckdb/node-api";

const filePath =
  "data/catalog/fipex/dataset/fipex-prices-latest-merged.parquet";

async function main() {
  console.log("\n=== FIPEX — ANÁLISE RÁPIDA ===\n");

  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  console.log("COLUNAS:");
  const columns = await connection.runAndReadAll(`
    DESCRIBE
    SELECT *
    FROM read_parquet('${filePath}')
  `);

  console.dir(columns.getRowObjects(), { depth: null });

  console.log("\nTOTAL DE REGISTROS:");

  const total = await connection.runAndReadAll(`
    SELECT COUNT(*) AS total
    FROM read_parquet('${filePath}')
  `);

  console.dir(total.getRowObjects(), { depth: null });

  console.log("\nAMOSTRA:");

  const sample = await connection.runAndReadAll(`
    SELECT *
    FROM read_parquet('${filePath}')
    LIMIT 5
  `);

  console.dir(sample.getRowObjects(), { depth: null });



  console.log("\n=== FIM ===\n");
}

main().catch((error) => {
  console.error("\nErro ao analisar FIPEX:");
  console.error(error);
  process.exit(1);
});
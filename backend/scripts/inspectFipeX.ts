import { DuckDBInstance } from "@duckdb/node-api";

const filePath =
  "data/catalog/fipex/dataset/fipex-prices-latest-merged.parquet";

async function main() {
  console.log("\n=== FIPEX — ANÁLISE DE CARROS ===\n");

  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  console.log("COLUNAS:");

  const columns = await connection.runAndReadAll(`
    DESCRIBE
    SELECT *
    FROM read_parquet('${filePath}')
  `);

  console.dir(columns.getRowObjects(), { depth: null });

  console.log("\nTOTAL DE CARROS:");

  const total = await connection.runAndReadAll(`
    SELECT COUNT(*) AS total
    FROM read_parquet('${filePath}')
    WHERE tipo_veiculo = 'carro'
  `);

  console.dir(total.getRowObjects(), { depth: null });

  console.log("\nMARCAS:");

  const brands = await connection.runAndReadAll(`
    SELECT
      nome_marca AS marca,
      COUNT(*) AS registros,
      COUNT(DISTINCT nome_modelo) AS modelos
    FROM read_parquet('${filePath}')
    WHERE tipo_veiculo = 'carro'
    GROUP BY nome_marca
    ORDER BY registros DESC
  `);

  console.dir(brands.getRowObjects(), { depth: null });

  console.log("\nPRINCIPAIS MODELOS:");

  const models = await connection.runAndReadAll(`
    SELECT
      nome_marca AS marca,
      nome_modelo AS modelo,
      COUNT(DISTINCT ano_modelo) AS anos,
      COUNT(*) AS registros,
      COUNT(DISTINCT codigo_fipe) AS codigos_fipe
    FROM read_parquet('${filePath}')
    WHERE tipo_veiculo = 'carro'
    GROUP BY nome_marca, nome_modelo
    ORDER BY registros DESC
    LIMIT 100
  `);

  console.dir(models.getRowObjects(), { depth: null });

  console.log("\n=== FIM ===\n");
}

main().catch((error) => {
  console.error("\nErro ao analisar FIPEX:");
  console.error(error);
  process.exit(1);
});
import 'dotenv/config';

import { carpediaClient } from '../data/catalog/carpedia/carpedia.client.js';

async function main() {
  console.log('=== TESTE COMPLETO CARPEDIA ===\n');

  // 1. Marca
  const brandsResponse = await carpediaClient.getBrands(1, 100);

  const toyota = brandsResponse.marcas.find(
    (brand) => brand.slug === 'toyota',
  );

  if (!toyota) {
    throw new Error('Toyota não encontrada.');
  }

  console.log(`Marca: ${toyota.nome}`);

  // 2. Modelo
  const modelsResponse = await carpediaClient.getModelsByBrand(
    toyota.slug,
    1,
    100,
  );

  const corolla = modelsResponse.modelos.find(
    (model) => model.slug === 'corolla',
  );

  if (!corolla) {
    throw new Error('Corolla não encontrado.');
  }

  console.log(`Modelo: ${corolla.nome}`);
  console.log(`Versões cadastradas: ${corolla.versoes}\n`);

  // 3. Versões
  const versionsResponse = await carpediaClient.getVersionsByModel(
    toyota.slug,
    corolla.slug,
  );

  console.log(`Versões retornadas: ${versionsResponse.versoes.length}\n`);

  for (const version of versionsResponse.versoes.slice(0, 10)) {
    console.log(
      `- ${version.nome} | ID: ${version.id} | anos: ${version.anos.join(', ')}`,
    );
  }

  // 4. Ficha técnica da primeira versão que possui ano
  const version = versionsResponse.versoes.find(
    (item) => item.anos.length > 0,
  );

  if (!version) {
    throw new Error('Nenhuma versão com ano disponível.');
  }

  const year = Number(version.anos[0]);

  console.log('\n=== FICHA TÉCNICA ===');
  console.log(`Versão: ${version.nome}`);
  console.log(`ID: ${version.id}`);
  console.log(`Ano: ${year}`);

  const ficha = await carpediaClient.getTechnicalSheet(
    version.id,
    year,
  );

  console.log(`\nReferência: ${ficha.ref}`);
  console.log(`Veículo: ${ficha.versao.nome}`);
  console.log(`Ano: ${ficha.ano}`);

  console.log('\nSeções recebidas:');

  for (const secao of ficha.secoes) {
    console.log(`\n[${secao.titulo}]`);

    for (const item of secao.itens) {
      console.log(`  ${item.label}: ${item.valor}`);
    }
  }

  if (ficha.consumo) {
    console.log('\n[CONSUMO]');
    console.log(ficha.consumo);
  }

  if (ficha.porte) {
    console.log('\n[PORTE]');
    console.log(ficha.porte);
  }

  console.log('\n=== TESTE CONCLUÍDO ===');
}

main().catch((error) => {
  console.error('\nErro ao consultar a Carpedia:');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});
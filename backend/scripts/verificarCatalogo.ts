import 'dotenv/config'

import { db } from '../src/prisma/db'

async function main() {
  console.log('\n==========================================')
  console.log('       VERIFICAÇÃO DO CATÁLOGO')
  console.log('==========================================\n')

  const brands =
    await db.orm.public.CarBrand
      .where({
        name: 'Mercedes-Benz',
      })
      .all()

  console.log('MARCAS:')
  console.log(brands)

  for (const brand of brands) {
    const models =
      await db.orm.public.CarModel
        .where({
          brandId: brand.id,
        })
        .all()

    console.log(`\nMODELOS DE ${brand.name}:`)
    console.log(
      models.map((model) => ({
        id: model.id,
        name: model.name,
      })),
    )
  }

  console.log('\n==========================================')
  console.log('                 FIM')
  console.log('==========================================\n')
}

main()
  .catch((error) => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
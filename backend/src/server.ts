import 'dotenv/config'

import path from 'node:path'
import express from 'express'
import cors from 'cors'

import routes from './routes'
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes'
import { processDueSubscriptions } from './modules/subscriptions/subscriptions.service'

const app = express()

const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json({ limit: '3mb' }))

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads')),
)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Plataforma Automotiva API funcionando',
  })
})

app.use('/api/subscription', subscriptionsRoutes)

app.use('/api', routes)

// Renovações e vencimentos das assinaturas (a cada 10 minutos e ao iniciar)
const BILLING_INTERVAL_MS = 10 * 60 * 1000

async function runBilling() {
  try {
    await processDueSubscriptions()
  } catch (error) {
    console.error('Erro ao processar assinaturas', error)
  }
}

app.listen(PORT, () => {
  console.log(`🚗 API rodando em http://localhost:${PORT}`)

  runBilling()
  setInterval(runBilling, BILLING_INTERVAL_MS)
})
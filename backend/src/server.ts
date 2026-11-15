import 'dotenv/config'

import path from 'node:path'
import express from 'express'
import cors from 'cors'

import routes from './routes'

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

app.use('/api', routes)

app.listen(PORT, () => {
  console.log(`🚗 API rodando em http://localhost:${PORT}`)
})
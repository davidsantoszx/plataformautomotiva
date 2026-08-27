import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Plataforma Automotiva API funcionando',
  })
})

app.listen(PORT, () => {
  console.log(`🚗 API rodando em http://localhost:${PORT}`)
})
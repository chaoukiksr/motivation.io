import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import letterRouter from './src/routes/letter.js'

const app  = express()
const PORT = process.env.PORT ?? 8000

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://motivation-io.vercel.app']

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', letterRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})

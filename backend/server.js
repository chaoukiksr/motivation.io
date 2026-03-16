import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import letterRouter  from './src/routes/letter.js'
import profileRouter from './src/routes/profile.js'
import { cacheStats } from './src/utils/cache.js'

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
app.use('/', profileRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── Cache stats (observability) ───────────────────────────────────────────────
app.get('/cache-stats', (_req, res) => res.json(cacheStats()))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})

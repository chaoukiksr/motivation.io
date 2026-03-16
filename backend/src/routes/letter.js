import { Router } from 'express'
import multer from 'multer'
import { extractCvText } from '../utils/cvParser.js'
import { scrapeOffer } from '../utils/offerScraper.js'
import { generateMotivationLetter, extractProgramInfo, analyzeOfferFit } from '../services/anthropicService.js'

const router = Router()

// Store upload in memory (no temp files on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, DOC and DOCX files are accepted.'))
    }
  },
})

// ── Shared validation helper ──────────────────────────────────────────────────
async function parseCvAndOffer(req, res) {
  if (!req.file) {
    res.status(400).json({ detail: 'CV file is required.' })
    return null
  }
  const { offer_url } = req.body
  if (!offer_url) {
    res.status(400).json({ detail: 'offer_url is required.' })
    return null
  }
  const cvText = await extractCvText(req.file.buffer, req.file.mimetype)
  if (!cvText) {
    res.status(422).json({ detail: 'Could not extract text from the CV file.' })
    return null
  }
  const scrapeResult = await scrapeOffer(offer_url)
  return { cvText, offerText: scrapeResult.text, offerUrl: offer_url, scrapeFromCache: scrapeResult.fromCache }
}

// ── POST /analyze-offer ───────────────────────────────────────────────────────
// Step 1: scrape the offer + run the two cheap Haiku calls.
// The user reviews the fit score before deciding to generate a letter.
router.post('/analyze-offer', upload.single('cv'), async (req, res) => {
  try {
    const parsed = await parseCvAndOffer(req, res)
    if (!parsed) return

    const { cvText, offerText, offerUrl, scrapeFromCache } = parsed

    const [programInfoResult, fitResult] = await Promise.all([
      extractProgramInfo(offerText, offerUrl),
      analyzeOfferFit(cvText, offerText, offerUrl),
    ])

    const tokenLog = {
      offerScraping: { fromCache: scrapeFromCache },
      fitAnalysis: {
        fromCache:    fitResult.meta.fromCache,
        inputTokens:  fitResult.meta.inputTokens,
        outputTokens: fitResult.meta.outputTokens,
      },
      programInfo: {
        fromCache:    programInfoResult.meta.fromCache,
        inputTokens:  programInfoResult.meta.inputTokens,
        outputTokens: programInfoResult.meta.outputTokens,
      },
    }

    return res.json({
      ...programInfoResult.data,
      programAnalysis: fitResult.data,
      tokenLog,
    })
  } catch (err) {
    console.error('[/analyze-offer]', err)
    if (err.status) return res.status(err.status).json({ detail: err.message })
    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

// ── POST /generate-letter ─────────────────────────────────────────────────────
// Step 2: generate the motivation letter (Opus only).
// Offer text is typically already cached from the /analyze-offer call,
// so scrapeOffer returns immediately from cache.
router.post('/generate-letter', upload.single('cv'), async (req, res) => {
  try {
    const parsed = await parseCvAndOffer(req, res)
    if (!parsed) return

    const { cvText, offerText, offerUrl, scrapeFromCache } = parsed
    const { language = 'English', text_length = 'medium', personal_note = '' } = req.body

    const letterResult = await generateMotivationLetter({
      cvText,
      offerText,
      offerUrl:     offerUrl,
      language,
      textLength:   text_length,
      personalNote: personal_note,
    })

    const tokenLog = {
      offerScraping: { fromCache: scrapeFromCache },
      letterGeneration: {
        fromCache:    letterResult.meta.fromCache,
        inputTokens:  letterResult.meta.inputTokens,
        outputTokens: letterResult.meta.outputTokens,
      },
    }

    return res.json({ letter: letterResult.letter, tokenLog })
  } catch (err) {
    console.error('[/generate-letter]', err)
    if (err.status) return res.status(err.status).json({ detail: err.message })
    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

export default router

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

// POST /api/generate-letter
router.post('/generate-letter', upload.single('cv'), async (req, res) => {
  try {
    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ detail: 'CV file is required.' })
    }

    const { offer_url, language = 'English', text_length = 'medium', personal_note = '' } = req.body

    if (!offer_url) {
      return res.status(400).json({ detail: 'offer_url is required.' })
    }

    // ── Parse CV ─────────────────────────────────────────────────────────────
    const cvText = await extractCvText(req.file.buffer, req.file.mimetype)
    if (!cvText) {
      return res.status(422).json({ detail: 'Could not extract text from the CV file.' })
    }

    // ── Scrape offer page ─────────────────────────────────────────────────────
    const offerText = await scrapeOffer(offer_url)

    // ── Extract program info + generate letter + analyse fit (in parallel) ───
    const [letter, programInfo, programAnalysis] = await Promise.all([
      generateMotivationLetter({
        cvText,
        offerText,
        offerUrl:     offer_url,
        language,
        textLength:   text_length,
        personalNote: personal_note,
      }),
      extractProgramInfo(offerText, offer_url),
      analyzeOfferFit(cvText, offerText, offer_url),
    ])

    return res.json({ letter, ...programInfo, programAnalysis })
  } catch (err) {
    console.error('[/generate-letter]', err)

    // Anthropic SDK errors carry a status code
    if (err.status) {
      return res.status(err.status).json({ detail: err.message })
    }

    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

export default router

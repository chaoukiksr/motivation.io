import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { scrapeOffer } from '../utils/offerScraper.js'
import { generateMotivationLetter, extractProgramInfo, analyzeOfferFit } from '../services/anthropicService.js'
import supabaseAdmin from '../utils/supabaseAdmin.js'

const router = Router()

/**
 * Fetch the authenticated user's stored CV text.
 * Writes a 400 response and returns null if missing.
 */
async function getCvText(userId, res) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('cv_text')
    .eq('id', userId)
    .single()

  if (error || !data?.cv_text) {
    res.status(400).json({ detail: 'No CV found. Please upload your CV first.' })
    return null
  }
  return data.cv_text
}

// ── POST /analyze-offer ────────────────────────────────────────────────────────
// Step 1 — cheap: scrape + 2 Haiku calls.
// Results are persisted in offer_analyses so the Opus step can reuse offer_text
// and the user never pays for the same analysis twice, even across sessions.
router.post('/analyze-offer', requireAuth, async (req, res) => {
  try {
    const { offer_url } = req.body
    if (!offer_url) return res.status(400).json({ detail: 'offer_url is required.' })

    const cvText = await getCvText(req.userId, res)
    if (!cvText) return

    // ── Check persistent DB cache ────────────────────────────────────────────
    const { data: cached } = await supabaseAdmin
      .from('offer_analyses')
      .select('offer_text, program_info, analysis')
      .eq('user_id', req.userId)
      .eq('offer_url', offer_url)
      .single()

    if (cached) {
      return res.json({
        ...cached.program_info,
        programAnalysis: cached.analysis,
        tokenLog: {
          offerScraping: { fromCache: true },
          fitAnalysis:   { fromCache: true, inputTokens: 0, outputTokens: 0 },
          programInfo:   { fromCache: true, inputTokens: 0, outputTokens: 0 },
        },
      })
    }

    // ── Cache miss — scrape and run models ───────────────────────────────────
    const scrapeResult = await scrapeOffer(offer_url)
    const offerText    = scrapeResult.text

    const [programInfoResult, fitResult] = await Promise.all([
      extractProgramInfo(offerText, offer_url),
      analyzeOfferFit(cvText, offerText, offer_url),
    ])

    // Persist so generate-letter can reuse offer_text without re-scraping
    await supabaseAdmin
      .from('offer_analyses')
      .upsert({
        user_id:      req.userId,
        offer_url,
        offer_text:   offerText,
        program_info: programInfoResult.data,
        analysis:     fitResult.data,
      })

    return res.json({
      ...programInfoResult.data,
      programAnalysis: fitResult.data,
      tokenLog: {
        offerScraping: { fromCache: scrapeResult.fromCache },
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
      },
    })
  } catch (err) {
    console.error('[/analyze-offer]', err)
    if (err.status) return res.status(err.status).json({ detail: err.message })
    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

// ── POST /generate-letter ─────────────────────────────────────────────────────
// Step 2 — expensive: Opus only.
// CV text and offer text are both fetched from the DB — no file upload needed.
router.post('/generate-letter', requireAuth, async (req, res) => {
  try {
    const { offer_url, language = 'English', text_length = 'medium', personal_note = '' } = req.body
    if (!offer_url) return res.status(400).json({ detail: 'offer_url is required.' })

    const cvText = await getCvText(req.userId, res)
    if (!cvText) return

    // Reuse offer_text stored during analyze step — avoids a second scrape
    const { data: storedAnalysis } = await supabaseAdmin
      .from('offer_analyses')
      .select('offer_text, program_info')
      .eq('user_id', req.userId)
      .eq('offer_url', offer_url)
      .single()

    let offerText, offerFromCache
    if (storedAnalysis?.offer_text) {
      offerText      = storedAnalysis.offer_text
      offerFromCache = true
    } else {
      // Fallback: user skipped analyze step
      const scrapeResult = await scrapeOffer(offer_url)
      offerText      = scrapeResult.text
      offerFromCache = scrapeResult.fromCache
    }

    const letterResult = await generateMotivationLetter({
      cvText,
      offerText,
      offerUrl:     offer_url,
      language,
      textLength:   text_length,
      personalNote: personal_note,
    })

    // Persist to letter history
    await supabaseAdmin.from('letters').insert({
      user_id:         req.userId,
      offer_url,
      university_name: storedAnalysis?.program_info?.universityName ?? '',
      master_acronym:  storedAnalysis?.program_info?.masterAcronym  ?? '',
      letter_text:     letterResult.letter,
      settings:        { language, text_length, personal_note },
    })

    return res.json({
      letter: letterResult.letter,
      tokenLog: {
        offerScraping:    { fromCache: offerFromCache },
        letterGeneration: {
          fromCache:    letterResult.meta.fromCache,
          inputTokens:  letterResult.meta.inputTokens,
          outputTokens: letterResult.meta.outputTokens,
        },
      },
    })
  } catch (err) {
    console.error('[/generate-letter]', err)
    if (err.status) return res.status(err.status).json({ detail: err.message })
    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

// ── GET /letters ──────────────────────────────────────────────────────────────
// Returns the user's 20 most recent generated letters.
router.get('/letters', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('letters')
      .select('id, offer_url, university_name, master_acronym, letter_text, settings, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return res.status(500).json({ detail: 'Failed to fetch letters.' })
    return res.json({ letters: data ?? [] })
  } catch (err) {
    console.error('[/letters]', err)
    return res.status(500).json({ detail: 'Internal server error.' })
  }
})

export default router

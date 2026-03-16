import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { cacheGet, cacheSet } from '../utils/cache.js'

/** 7 days — model results for the same inputs are deterministic */
const MODEL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const client = new Anthropic()  // reads ANTHROPIC_API_KEY from env

const LENGTH_GUIDE = {
  short:  'approximately 200 words — concise and punchy',
  medium: 'approximately 350 words — balanced and professional',
  long:   'approximately 500 words — comprehensive and detailed',
}

/**
 * Call Claude (claude-opus-4-6) to generate a motivation letter.
 *
 * @param {Object} params
 * @param {string} params.cvText       - Extracted text from the candidate's CV
 * @param {string} params.offerText    - Scraped text from the offer page
 * @param {string} params.offerUrl     - Original offer URL
 * @param {string} params.language     - Output language (e.g. 'French', 'English')
 * @param {string} params.textLength   - 'short' | 'medium' | 'long'
 * @param {string} params.personalNote - Candidate's personal notes / instructions
 * @returns {Promise<string>} The generated motivation letter
 */
export async function generateMotivationLetter({ cvText, offerText, offerUrl, language = 'English', textLength, personalNote }) {
  const lengthInstruction = LENGTH_GUIDE[textLength] ?? LENGTH_GUIDE.medium

  const systemPrompt = `You are an expert career coach and professional writer specializing in academic and master's program applications.
Your task is to write a compelling, authentic motivation letter based on the candidate's CV and the program/offer details provided.

Guidelines:
- Write ENTIRELY in ${language} — every single word must be in ${language}
- Write in a formal yet engaging first-person tone
- Tailor every paragraph to the specific program and institution
- Highlight relevant skills, experiences, and achievements from the CV
- Explain clearly why the candidate is a strong fit for this program
- Show genuine enthusiasm for the field
- Target length: ${lengthInstruction}
- Output ONLY the letter body — no subject line, no meta-commentary
- Use proper letter structure: opening, body paragraphs, closing`

  const userMessage = `Here is the candidate's CV:
<cv>
${cvText}
</cv>

Here is the master's program offer (from ${offerUrl}):
<offer>
${offerText}
</offer>

${personalNote ? `Additional instructions from the candidate:\n<notes>\n${personalNote}\n</notes>\n` : ''}
Please write the motivation letter now.`

  // Stream internally + finalMessage() to avoid HTTP timeouts on long outputs
  // Note: .stream() returns a MessageStream synchronously — no await needed here.
  const stream = client.messages.stream({
    model:      'claude-opus-4-6',
    max_tokens: 2048,
    thinking:   { type: 'adaptive' },
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const response  = await stream.finalMessage()
  const textBlock = response.content.find(block => block.type === 'text')

  if (!textBlock) throw new Error('No text content returned by the model.')
  return {
    letter: textBlock.text.trim(),
    meta:   {
      fromCache:    false,
      inputTokens:  response.usage?.input_tokens  ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    },
  }
}

/**
 * Analyse how well the candidate's CV matches the master program offer.
 *
 * @param {string} cvText    - Extracted text from the candidate's CV
 * @param {string} offerText - Scraped text from the offer page
 * @param {string} offerUrl  - Original offer URL
 * @returns {Promise<{ overview, fitScore, fitSummary, skillsToAcquire, keyLearnings }>}
 */
export async function analyzeOfferFit(cvText, offerText, offerUrl) {
  // Key includes a short hash of the CV so a changed CV busts the cache
  // while the same CV + same URL always returns the cached analysis.
  const cvHash   = createHash('sha256').update(cvText).digest('hex').slice(0, 16)
  const cacheKey = `offerFit:${cvHash}:${offerUrl}`
  const cached   = cacheGet(cacheKey)

  if (cached !== undefined) {
    console.log(`[cache] HIT  analyzeOfferFit → ${offerUrl} (cv:${cvHash})`)
    return { data: cached, meta: { fromCache: true, inputTokens: 0, outputTokens: 0 } }
  }

  console.log(`[cache] MISS analyzeOfferFit → ${offerUrl} (cv:${cvHash})`)

  const message = await client.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 1024,
    system:     'Tu es un conseiller carrière spécialisé dans les admissions en master. Analyse l\'adéquation entre le profil d\'un candidat et un programme. Réponds avec un seul objet JSON valide — pas de markdown, pas de blocs de code, aucune explication en dehors du JSON.',
    messages:   [{
      role:    'user',
      content: `Étape 1 — Lis attentivement le CV du candidat et déduis ses objectifs de carrière, intérêts techniques et ambitions à partir de ses projets, expériences et tout objectif déclaré.
Étape 2 — Lis l'offre du programme de master et comprends sur quoi il est axé.
Étape 3 — Évalue dans quelle mesure le profil déduit du candidat correspond au programme.

Toutes les valeurs textuelles du JSON doivent être rédigées en français.

CV du candidat :
${cvText.slice(0, 4000)}

Offre du programme de master (depuis ${offerUrl}) :
${offerText.slice(0, 3000)}

Retourne UNIQUEMENT cet objet JSON, sans texte avant ni après :
{"extractedGoals":["objectif ou intérêt déduit 1","objectif ou intérêt déduit 2"],"overview":"description en 2-3 phrases du programme et de son orientation","fitScore":75,"fitSummary":"2-3 phrases expliquant le score en reliant les objectifs et projets déduits du candidat au contenu du programme","skillsToAcquire":["compétence1","compétence2"],"keyLearnings":["apprentissage1","apprentissage2"]}`,
    }],
  })

  const raw = message.content.find(b => b.type === 'text')?.text?.trim() ?? '{}'

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  console.log('[analyzeOfferFit] raw model output:', cleaned)

  try {
    const parsed = JSON.parse(cleaned)
    const result = {
      extractedGoals:  parsed.extractedGoals  ?? [],
      overview:        parsed.overview        ?? '',
      fitScore:        parsed.fitScore        ?? 0,
      fitSummary:      parsed.fitSummary      ?? '',
      skillsToAcquire: parsed.skillsToAcquire ?? [],
      keyLearnings:    parsed.keyLearnings    ?? [],
    }
    cacheSet(cacheKey, result, MODEL_CACHE_TTL_MS)
    return {
      data: result,
      meta: {
        fromCache:    false,
        inputTokens:  message.usage?.input_tokens  ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
    }
  } catch (e) {
    console.error('[analyzeOfferFit] JSON parse failed:', e.message, '\nRaw:', cleaned)
    return {
      data: { extractedGoals: [], overview: '', fitScore: 0, fitSummary: '', skillsToAcquire: [], keyLearnings: [] },
      meta: { fromCache: false, inputTokens: 0, outputTokens: 0 },
    }
  }
}

/**
 * Extract university name and master program acronym from scraped offer text.
 * Uses a fast, lightweight call — no thinking needed.
 *
 * @param {string} offerText - Scraped text from the offer page
 * @param {string} offerUrl  - Original offer URL (extra hint for the model)
 * @returns {Promise<{ universityName: string, masterAcronym: string }>}
 */
export async function extractProgramInfo(offerText, offerUrl) {
  const cacheKey = `programInfo:${offerUrl}`
  const cached   = cacheGet(cacheKey)

  if (cached !== undefined) {
    console.log(`[cache] HIT  extractProgramInfo → ${offerUrl}`)
    return { data: cached, meta: { fromCache: true, inputTokens: 0, outputTokens: 0 } }
  }

  console.log(`[cache] MISS extractProgramInfo → ${offerUrl}`)

  const message = await client.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 128,
    system:     'You extract structured data from text. Reply with valid JSON only — no markdown, no explanation.',
    messages:   [{
      role:    'user',
      content: `From the master's program offer page below, extract:
1. "universityName": the full name of the university or institution (e.g. "MIT", "University of Amsterdam")
2. "masterAcronym": the short name or acronym of the master program (e.g. "MSc-AI", "MScCS", "M2 IA")

If a value cannot be determined, use an empty string "".

Offer URL: ${offerUrl}

Offer text:
${offerText.slice(0, 3000)}

Reply with exactly this JSON:
{"universityName":"...","masterAcronym":"..."}`,
    }],
  })

  const raw = message.content.find(b => b.type === 'text')?.text?.trim() ?? '{}'
  try {
    const parsed = JSON.parse(raw)
    const result = {
      universityName: parsed.universityName ?? '',
      masterAcronym:  parsed.masterAcronym  ?? '',
    }
    cacheSet(cacheKey, result, MODEL_CACHE_TTL_MS)
    return {
      data: result,
      meta: {
        fromCache:    false,
        inputTokens:  message.usage?.input_tokens  ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
    }
  } catch {
    return {
      data: { universityName: '', masterAcronym: '' },
      meta: { fromCache: false, inputTokens: 0, outputTokens: 0 },
    }
  }
}

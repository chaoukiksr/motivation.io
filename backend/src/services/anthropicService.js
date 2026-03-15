import Anthropic from '@anthropic-ai/sdk'

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
  const stream = await client.messages.stream({
    model:      'claude-opus-4-6',
    max_tokens: 2048,
    thinking:   { type: 'adaptive' },
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const response  = await stream.finalMessage()
  const textBlock = response.content.find(block => block.type === 'text')

  if (!textBlock) throw new Error('No text content returned by the model.')
  return textBlock.text.trim()
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
  const message = await client.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 1024,
    system:     'You are a career advisor specialising in master\'s program admissions. Analyse fit between a candidate\'s profile and a program. Reply with a single valid JSON object — no markdown, no code fences, no explanation outside the JSON.',
    messages:   [{
      role:    'user',
      content: `Step 1 — Read the candidate's CV carefully and infer their career goals, technical interests, and ambitions from their projects, experience, and any stated objectives.
Step 2 — Read the master's program offer and understand what it focuses on.
Step 3 — Score how well the candidate's inferred profile fits the program.

Candidate CV:
${cvText.slice(0, 4000)}

Master's Program Offer (from ${offerUrl}):
${offerText.slice(0, 3000)}

Return ONLY this JSON object with no extra text before or after:
{"extractedGoals":["inferred goal or interest 1","inferred goal or interest 2"],"overview":"2-3 sentence description of the program and its focus","fitScore":75,"fitSummary":"2-3 sentences explaining the score by connecting the candidate's inferred goals and projects to the program's content","skillsToAcquire":["skill1","skill2"],"keyLearnings":["learning1","learning2"]}`,
    }],
  })

  const raw = message.content.find(b => b.type === 'text')?.text?.trim() ?? '{}'

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  console.log('[analyzeOfferFit] raw model output:', cleaned)

  try {
    const parsed = JSON.parse(cleaned)
    return {
      extractedGoals:  parsed.extractedGoals  ?? [],
      overview:        parsed.overview        ?? '',
      fitScore:        parsed.fitScore        ?? 0,
      fitSummary:      parsed.fitSummary      ?? '',
      skillsToAcquire: parsed.skillsToAcquire ?? [],
      keyLearnings:    parsed.keyLearnings    ?? [],
    }
  } catch (e) {
    console.error('[analyzeOfferFit] JSON parse failed:', e.message, '\nRaw:', cleaned)
    return { extractedGoals: [], overview: '', fitScore: 0, fitSummary: '', skillsToAcquire: [], keyLearnings: [] }
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
    return {
      universityName: parsed.universityName ?? '',
      masterAcronym:  parsed.masterAcronym  ?? '',
    }
  } catch {
    return { universityName: '', masterAcronym: '' }
  }
}

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyzeOffer, generateLetter } from '@/services/letterService'

export const useLetterStore = defineStore('letter', () => {
  // ── Form state ──────────────────────────────────────────────────────────────
  const offerUrl        = ref('')
  const universityName  = ref('')
  const masterAcronym   = ref('')
  const language        = ref('English')
  const textLength      = ref('medium')
  const personalNote    = ref('')

  // ── Result state ─────────────────────────────────────────────────────────────
  const programAnalysis   = ref(null)
  const generatedLetter   = ref('')
  const tokenLog          = ref(null)

  // ── Loading states ───────────────────────────────────────────────────────────
  const isAnalyzing  = ref(false)
  const isGenerating = ref(false)
  const error        = ref(null)

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  async function analyze() {
    if (!offerUrl.value) {
      error.value = 'Please provide the offer URL.'
      return
    }

    isAnalyzing.value     = true
    error.value           = null
    programAnalysis.value = null
    generatedLetter.value = ''
    universityName.value  = ''
    masterAcronym.value   = ''
    tokenLog.value        = null

    try {
      const result = await analyzeOffer({ offerUrl: offerUrl.value })
      if (result.universityName)  universityName.value  = result.universityName
      if (result.masterAcronym)   masterAcronym.value   = result.masterAcronym
      if (result.programAnalysis) programAnalysis.value = result.programAnalysis
      if (result.tokenLog)        tokenLog.value        = result.tokenLog
    } catch (err) {
      error.value = err.response?.data?.detail ?? 'An unexpected error occurred.'
    } finally {
      isAnalyzing.value = false
    }
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  async function generate() {
    if (!offerUrl.value) {
      error.value = 'Please provide the offer URL.'
      return
    }

    isGenerating.value = true
    error.value        = null
    tokenLog.value     = null

    try {
      const result = await generateLetter({
        offerUrl:     offerUrl.value,
        language:     language.value,
        textLength:   textLength.value,
        personalNote: personalNote.value,
      })
      generatedLetter.value = result.letter
      if (result.tokenLog) tokenLog.value = result.tokenLog
    } catch (err) {
      error.value = err.response?.data?.detail ?? 'An unexpected error occurred.'
    } finally {
      isGenerating.value = false
    }
  }

  function reset() {
    offerUrl.value        = ''
    universityName.value  = ''
    masterAcronym.value   = ''
    language.value        = 'English'
    textLength.value      = 'medium'
    personalNote.value    = ''
    programAnalysis.value = null
    generatedLetter.value = ''
    tokenLog.value        = null
    error.value           = null
  }

  return {
    offerUrl, universityName, masterAcronym,
    language, textLength, personalNote,
    programAnalysis, generatedLetter, tokenLog,
    isAnalyzing, isGenerating, error,
    analyze, generate, reset,
  }
})

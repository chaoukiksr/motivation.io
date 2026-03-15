import { defineStore } from 'pinia'
import { ref } from 'vue'
import { generateLetter } from '@/services/letterService'

export const useLetterStore = defineStore('letter', () => {
  // ── Form state ──────────────────────────────────────────────────────────────
  const cvFile          = ref(null)
  const offerUrl        = ref('')
  const universityName  = ref('')
  const masterAcronym   = ref('')
  const language        = ref('English')
  const textLength      = ref('medium')
  const personalNote    = ref('')

  // ── Result state ─────────────────────────────────────────────────────────────
  const generatedLetter = ref('')
  const isLoading       = ref(false)
  const error           = ref(null)

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function generate() {
    if (!cvFile.value || !offerUrl.value) {
      error.value = 'Please upload your CV and provide the offer URL.'
      return
    }

    isLoading.value = true
    error.value     = null

    try {
      const result = await generateLetter({
        cvFile:       cvFile.value,
        offerUrl:     offerUrl.value,
        language:     language.value,
        textLength:   textLength.value,
        personalNote: personalNote.value,
      })
      generatedLetter.value = result.letter
      if (result.universityName) universityName.value = result.universityName
      if (result.masterAcronym)  masterAcronym.value  = result.masterAcronym
    } catch (err) {
      error.value = err.response?.data?.detail ?? 'An unexpected error occurred. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    cvFile.value          = null
    offerUrl.value        = ''
    universityName.value  = ''
    masterAcronym.value   = ''
    language.value        = 'English'
    textLength.value      = 'medium'
    personalNote.value    = ''
    generatedLetter.value = ''
    error.value           = null
  }

  return {
    cvFile, offerUrl, universityName, masterAcronym,
    language, textLength, personalNote,
    generatedLetter, isLoading, error,
    generate, reset,
  }
})

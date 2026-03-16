import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
})

/**
 * Send form data to the backend to generate a motivation letter.
 *
 * @param {File}   cvFile       - The uploaded CV file
 * @param {string} offerUrl     - URL of the master offer
 * @param {string} textLength   - 'short' | 'medium' | 'long'
 * @param {string} personalNote - Free-text personal notes
 * @returns {Promise<{ letter: string }>}
 */
export async function analyzeOffer({ cvFile, offerUrl }) {
  const formData = new FormData()
  formData.append('cv', cvFile)
  formData.append('offer_url', offerUrl)

  const { data } = await api.post('/analyze-offer', formData)
  return data
}

export async function generateLetter({ cvFile, offerUrl, language, textLength, personalNote }) {
  const formData = new FormData()
  formData.append('cv', cvFile)
  formData.append('offer_url', offerUrl)
  formData.append('language', language)
  formData.append('text_length', textLength)
  formData.append('personal_note', personalNote)

  const { data } = await api.post('/generate-letter', formData)
  return data
}

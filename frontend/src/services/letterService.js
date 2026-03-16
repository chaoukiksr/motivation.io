import axios from 'axios'
import { supabase } from '@/lib/supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000,
})

// Attach the Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export async function getProfile() {
  const { data } = await api.get('/profile')
  return data
}

export async function uploadCv(cvFile) {
  const formData = new FormData()
  formData.append('cv', cvFile)
  const { data } = await api.post('/profile/cv', formData)
  return data
}

export async function analyzeOffer({ offerUrl }) {
  const { data } = await api.post('/analyze-offer', { offer_url: offerUrl })
  return data
}

export async function generateLetter({ offerUrl, language, textLength, personalNote }) {
  const { data } = await api.post('/generate-letter', {
    offer_url:     offerUrl,
    language,
    text_length:   textLength,
    personal_note: personalNote,
  })
  return data
}

export async function getLetters() {
  const { data } = await api.get('/letters')
  return data.letters
}

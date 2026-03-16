import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/services/letterService'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const session = ref(null)
  const profile = ref(null)   // { hasCv, cvFilename, updatedAt }
  const loading = ref(true)

  // Call once on app mount — sets up the session and subscribes to changes
  async function init() {
    const { data: { session: s } } = await supabase.auth.getSession()
    session.value = s
    user.value    = s?.user ?? null
    if (user.value) await refreshProfile()
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, s) => {
      session.value = s
      user.value    = s?.user ?? null
      if (user.value) await refreshProfile()
      else profile.value = null
    })
  }

  async function refreshProfile() {
    try {
      profile.value = await getProfile(session.value?.access_token)
    } catch {
      profile.value = { hasCv: false, cvFilename: null }
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, session, profile, loading, init, refreshProfile, signInWithGoogle, signOut }
})

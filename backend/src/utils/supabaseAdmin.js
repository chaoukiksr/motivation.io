import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for server-side use only.
 * Bypasses Row Level Security — never expose this key to the browser.
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default supabaseAdmin

import supabaseAdmin from '../utils/supabaseAdmin.js'

/**
 * Express middleware that validates the Supabase JWT sent by the frontend.
 * Attaches req.userId on success.
 */
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1]

  if (!token) {
    return res.status(401).json({ detail: 'Missing auth token.' })
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ detail: 'Invalid or expired token.' })
  }

  req.userId = user.id
  next()
}

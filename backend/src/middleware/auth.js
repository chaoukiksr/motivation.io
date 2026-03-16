import { jwtVerify, createSecretKey } from 'jose'

// Lazily-created secret key — avoids re-creating it on every request.
// SUPABASE_JWT_SECRET is found in: Supabase Dashboard → Project Settings → API → JWT Secret
let _secretKey
function getSecretKey() {
  if (!_secretKey) {
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) throw new Error('SUPABASE_JWT_SECRET is not set in environment variables.')
    _secretKey = createSecretKey(Buffer.from(secret, 'utf8'))
  }
  return _secretKey
}

/**
 * Express middleware that validates the Supabase JWT sent by the frontend.
 *
 * Verification is done LOCALLY using the JWT signing secret — no network call
 * to Supabase is made. This keeps auth overhead at ~1 ms (pure CPU) rather
 * than 50–500 ms per request that supabaseAdmin.auth.getUser(token) would cost.
 *
 * Attaches req.userId (the Supabase user UUID) on success.
 */
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1]

  if (!token) {
    return res.status(401).json({ detail: 'Missing auth token.' })
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token.' })
  }
}

import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { extractCvText } from '../utils/cvParser.js'
import supabaseAdmin from '../utils/supabaseAdmin.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    cb(allowed.includes(file.mimetype) ? null : new Error('Only PDF, DOC and DOCX files are accepted.'), allowed.includes(file.mimetype))
  },
})

// GET /profile
// Returns whether the user has a saved CV (filename only — cv_text stays server-side).
router.get('/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('cv_filename, updated_at')
    .eq('id', req.userId)
    .single()

  if (error) return res.json({ hasCv: false, cvFilename: null })

  return res.json({
    hasCv:      !!data?.cv_filename,
    cvFilename: data?.cv_filename ?? null,
    updatedAt:  data?.updated_at  ?? null,
  })
})

// POST /profile/cv
// Parses the uploaded CV, stores the extracted text in profiles,
// and invalidates all cached offer analyses for this user (CV changed → analyses are stale).
router.post('/profile/cv', requireAuth, upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'CV file is required.' })

  const cvText = await extractCvText(req.file.buffer, req.file.mimetype)
  if (!cvText) return res.status(422).json({ detail: 'Could not extract text from CV.' })

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id:          req.userId,
      cv_text:     cvText,
      cv_filename: req.file.originalname,
      updated_at:  new Date().toISOString(),
    })

  if (error) return res.status(500).json({ detail: 'Failed to save CV.' })

  // Invalidate cached analyses — they were computed against the old CV
  await supabaseAdmin
    .from('offer_analyses')
    .delete()
    .eq('user_id', req.userId)

  return res.json({ hasCv: true, cvFilename: req.file.originalname })
})

export default router

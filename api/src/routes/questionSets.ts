import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// GET /question-sets - List all question sets
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('question_sets')
      .select('*')
      .order('name')

    if (error) throw error

    res.json(data || [])
  } catch (error: any) {
    console.error('Error fetching question sets:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch question sets' })
  }
})

export default router

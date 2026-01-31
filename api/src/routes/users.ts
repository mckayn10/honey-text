import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { addSmsParticipant } from '../lib/twilio.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// GET /users/me - Get current user profile
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, phone')
      .eq('id', userId)
      .single()

    if (error) throw error
    res.json(data)
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' })
  }
})

// PATCH /users/me - Update current user profile (phone, display_name)
router.patch('/me', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { phone, display_name } = req.body

    if (!phone && !display_name) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const updateData: Record<string, string> = {}
    if (phone !== undefined) updateData.phone = phone
    if (display_name !== undefined) updateData.display_name = display_name

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, display_name, phone')
      .single()

    if (error) throw error

    // Ensure group owner is added as member to all owned groups if phone is set
    if (updatedUser?.phone) {
      const { data: groups } = await supabaseAdmin
        .from('groups')
        .select('id, conversation_sid')
        .eq('owner_id', userId)

      const groupIds = (groups || []).map((g) => g.id)
      if (groupIds.length > 0) {
        const { data: existingMembers } = await supabaseAdmin
          .from('group_members')
          .select('group_id, participant_sid')
          .in('group_id', groupIds)
          .eq('phone', updatedUser.phone)

        const existingGroupIds = new Set(
          (existingMembers || []).map((m) => m.group_id)
        )
        const existingParticipantGroups = new Set(
          (existingMembers || [])
            .filter((m) => m.participant_sid)
            .map((m) => m.group_id)
        )

        const toInsert = (groups || [])
          .filter((g) => !existingGroupIds.has(g.id))
          .map((g) => ({
            group_id: g.id,
            name: updatedUser.display_name || updatedUser.email || 'Group Owner',
            phone: updatedUser.phone,
            confirmed_at: new Date().toISOString(),
            is_owner: true,
          }))

        if (toInsert.length > 0) {
          await supabaseAdmin.from('group_members').insert(toInsert)
        }

        // Add owner as SMS participant to conversations (if missing)
        for (const group of groups || []) {
          if (!group.conversation_sid) continue
          if (existingParticipantGroups.has(group.id)) continue
          const participant = await addSmsParticipant(group.conversation_sid, updatedUser.phone)
          await supabaseAdmin
            .from('group_members')
            .update({ participant_sid: participant.sid, is_owner: true })
            .eq('group_id', group.id)
            .eq('phone', updatedUser.phone)
        }
      }
    }

    res.json(updatedUser)
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    res.status(500).json({ error: error.message || 'Failed to update user profile' })
  }
})

export default router

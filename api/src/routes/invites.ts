import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { addSmsParticipant } from '../lib/twilio.js'

const router = express.Router()

// GET /invites/:token - Get invite details (public)
router.get('/:token', async (req, res) => {
  try {
    const token = req.params.token

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('group_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite already accepted' })
    }

    // Get group details
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('name, owner_id')
      .eq('id', invite.group_id)
      .single()

    // Get creator name
    let creatorName = null
    if (group?.owner_id) {
      const { data: creator } = await supabaseAdmin
        .from('users')
        .select('display_name')
        .eq('id', group.owner_id)
        .single()
      creatorName = creator?.display_name
    }

    res.json({
      invitee_name: invite.invitee_name,
      invitee_phone: invite.invitee_phone,
      group_name: group?.name,
      creator_name: creatorName,
    })
  } catch (error: any) {
    console.error('Error fetching invite:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch invite' })
  }
})

// POST /invites/:token/accept - Accept invite (public)
router.post('/:token/accept', async (req, res) => {
  try {
    const token = req.params.token

    // Get invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('group_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    // If already accepted, return success (idempotent)
    if (invite.status === 'accepted') {
      return res.json({ message: 'Invite already accepted' })
    }

    // Update invite status
    const { error: updateError } = await supabaseAdmin
      .from('group_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    if (updateError) throw updateError

    // Get group to find conversation
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('conversation_sid')
      .eq('id', invite.group_id)
      .single()

    let participantSid: string | null = null
    if (group?.conversation_sid) {
      const participant = await addSmsParticipant(group.conversation_sid, invite.invitee_phone)
      participantSid = participant.sid
    }

    // Create group member
    const { error: memberError } = await supabaseAdmin
      .from('group_members')
      .insert({
        group_id: invite.group_id,
        name: invite.invitee_name,
        phone: invite.invitee_phone,
        invite_id: invite.id,
        confirmed_at: new Date().toISOString(),
        participant_sid: participantSid,
        is_owner: false,
      })

    if (memberError) throw memberError

    res.json({ message: 'Invite accepted successfully' })
  } catch (error: any) {
    console.error('Error accepting invite:', error)
    res.status(500).json({ error: error.message || 'Failed to accept invite' })
  }
})

export default router

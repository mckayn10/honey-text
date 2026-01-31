import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { createConversation, addProjectedParticipant, addSmsParticipant, removeParticipant, deleteConversation } from '../lib/twilio.js'
import { randomBytes } from 'crypto'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// GET /groups - List all groups for the current user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json(data || [])
  } catch (error: any) {
    console.error('Error fetching groups:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch groups' })
  }
})

// POST /groups - Create a new group
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { name, question_set_id, schedule_day, schedule_time, schedule_timezone } = req.body

    if (!name || question_set_id === undefined || schedule_day === undefined || !schedule_time || !schedule_timezone) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabaseAdmin
      .from('groups')
      .insert({
        owner_id: userId,
        name,
        question_set_id,
        schedule_day,
        schedule_time,
        schedule_timezone,
      })
      .select()
      .single()

    if (error) throw error

    // Initialize send state
    await supabaseAdmin
      .from('group_send_state')
      .insert({
        group_id: data.id,
        last_question_index: 0,
      })

    // Create Twilio Conversation and projected participant for Honey Messages
    const conversation = await createConversation(data.name)
    try {
      await addProjectedParticipant(conversation.sid, `honeytext-${data.id}`)
    } catch (twilioErr: any) {
      if (twilioErr?.code === 50407) {
        throw new Error(
          'Invalid Twilio number for Group MMS. Set TWILIO_PHONE_NUMBER in api/.env to a US/Canada long code you own in Twilio (E.164, e.g. +15551234567).'
        )
      }
      throw twilioErr
    }

    await supabaseAdmin
      .from('groups')
      .update({ conversation_sid: conversation.sid })
      .eq('id', data.id)

    // Add group owner as a member if phone exists
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('display_name, email, phone')
      .eq('id', userId)
      .single()

    if (userProfile?.phone) {
      const participant = await addSmsParticipant(conversation.sid, userProfile.phone)
      const { data: existingMember } = await supabaseAdmin
        .from('group_members')
        .select('id')
        .eq('group_id', data.id)
        .eq('phone', userProfile.phone)
        .maybeSingle()

      if (!existingMember) {
        await supabaseAdmin
          .from('group_members')
          .insert({
            group_id: data.id,
            name: userProfile.display_name || userProfile.email || 'Group Owner',
            phone: userProfile.phone,
            confirmed_at: new Date().toISOString(),
            participant_sid: participant.sid,
            is_owner: true,
          })
      } else {
        await supabaseAdmin
          .from('group_members')
          .update({ participant_sid: participant.sid, is_owner: true })
          .eq('id', existingMember.id)
      }
    }

    res.json({
      ...data,
      needs_phone: !userProfile?.phone,
      conversation_sid: conversation.sid,
    })
  } catch (error: any) {
    console.error('Error creating group:', error)
    res.status(500).json({ error: error.message || 'Failed to create group' })
  }
})

// GET /groups/:id - Get group details with invites and members
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id

    // Get group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (groupError) throw groupError
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Get invites
    const { data: invites } = await supabaseAdmin
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    // Get members
    const { data: members } = await supabaseAdmin
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('confirmed_at', { ascending: false })

    // Get owner profile
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email, phone')
      .eq('id', userId)
      .single()

    res.json({
      group,
      owner,
      invites: invites || [],
      members: members || [],
    })
  } catch (error: any) {
    console.error('Error fetching group:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch group' })
  }
})

// PATCH /groups/:id - Update group
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id
    const { name, question_set_id, schedule_day, schedule_time, schedule_timezone } = req.body

    // Verify ownership
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (question_set_id !== undefined) updateData.question_set_id = question_set_id
    if (schedule_day !== undefined) updateData.schedule_day = schedule_day
    if (schedule_time !== undefined) updateData.schedule_time = schedule_time
    if (schedule_timezone !== undefined) updateData.schedule_timezone = schedule_timezone

    const { data, error } = await supabaseAdmin
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error updating group:', error)
    res.status(500).json({ error: error.message || 'Failed to update group' })
  }
})

// DELETE /groups/:id - Delete a group (owner only)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id

    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id, conversation_sid')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (group.conversation_sid) {
      try {
        await deleteConversation(group.conversation_sid)
      } catch (err) {
        console.error('Failed to delete Twilio conversation:', err)
      }
    }

    const { error } = await supabaseAdmin
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (error) throw error

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting group:', error)
    res.status(500).json({ error: error.message || 'Failed to delete group' })
  }
})

// POST /groups/:id/invites - Create an invite
router.post('/:id/invites', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id
    const { invitee_name, invitee_phone } = req.body

    if (!invitee_name || !invitee_phone) {
      return res.status(400).json({ error: 'Missing invitee_name or invitee_phone' })
    }

    // Verify ownership
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex')

    const { data, error } = await supabaseAdmin
      .from('group_invites')
      .insert({
        group_id: groupId,
        invitee_name,
        invitee_phone,
        token,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    const origin = process.env.CORS_ORIGIN || 'http://localhost:3000'
    const inviteUrl = `${origin}/invite/${token}`

    res.json({
      ...data,
      inviteUrl,
    })
  } catch (error: any) {
    console.error('Error creating invite:', error)
    res.status(500).json({ error: error.message || 'Failed to create invite' })
  }
})

// DELETE /groups/:id/invites/:inviteId - Delete a pending invite
router.delete('/:id/invites/:inviteId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id
    const inviteId = req.params.inviteId

    // Verify ownership
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Ensure invite exists and is pending
    const { data: invite } = await supabaseAdmin
      .from('group_invites')
      .select('id, status')
      .eq('id', inviteId)
      .eq('group_id', groupId)
      .single()

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending invites can be deleted' })
    }

    const { error } = await supabaseAdmin
      .from('group_invites')
      .delete()
      .eq('id', inviteId)
      .eq('group_id', groupId)

    if (error) throw error

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting invite:', error)
    res.status(500).json({ error: error.message || 'Failed to delete invite' })
  }
})

// DELETE /groups/:id/members/:memberId - Delete a group member
router.delete('/:id/members/:memberId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id
    const memberId = req.params.memberId

    // Verify ownership
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const { data: member } = await supabaseAdmin
      .from('group_members')
      .select('id, participant_sid')
      .eq('id', memberId)
      .eq('group_id', groupId)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Remove from Twilio Conversation if participant exists
    if (member.participant_sid) {
      const { data: groupWithConversation } = await supabaseAdmin
        .from('groups')
        .select('conversation_sid')
        .eq('id', groupId)
        .single()

      if (groupWithConversation?.conversation_sid) {
        await removeParticipant(groupWithConversation.conversation_sid, member.participant_sid)
      }
    }

    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('id', memberId)
      .eq('group_id', groupId)

    if (error) throw error

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting member:', error)
    res.status(500).json({ error: error.message || 'Failed to delete member' })
  }
})

export default router

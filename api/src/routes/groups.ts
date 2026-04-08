import express from 'express'
import { authenticateUser, AuthRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { addSmsParticipant, removeParticipant, deleteConversation, sendSMS, toE164 } from '../lib/twilio.js'
import { checkCanCreateGroup, checkCanAddMemberToGroup } from '../lib/subscriptionLimits.js'
import { ensureGroupConversation } from '../lib/groupConversation.js'
import { randomBytes, randomInt } from 'crypto'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// GET /groups - List all groups for the current user (with question_set name and member count)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select(`
        *,
        question_sets(name)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const groupIds = (groups || []).map((g: any) => g.id)
    if (groupIds.length === 0) {
      return res.json([])
    }

    const { data: members } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)

    const memberCountByGroup: Record<string, number> = {}
    for (const g of groupIds) memberCountByGroup[g] = 0
    for (const m of members || []) {
      memberCountByGroup[m.group_id] = (memberCountByGroup[m.group_id] || 0) + 1
    }

    const result = (groups || []).map((g: any) => {
      const { question_sets, ...group } = g
      return {
        ...group,
        question_set_name: question_sets?.name ?? null,
        member_count: memberCountByGroup[g.id] ?? 0,
      }
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error fetching groups:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch groups' })
  }
})

// POST /groups - Create a new group (pending until owner replies YES to SMS)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { name, question_set_id, schedule_day, schedule_time, schedule_timezone } = req.body

    if (!name || question_set_id === undefined || schedule_day === undefined || !schedule_time || !schedule_timezone) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('display_name, email, phone')
      .eq('id', userId)
      .single()

    if (!userProfile?.phone) {
      return res.status(400).json({ error: 'Add your phone number in Profile before creating a group' })
    }

    const canCreate = await checkCanCreateGroup(userId)
    if (!canCreate) {
      return res.status(400).json({ error: 'Upgrade your plan to create more groups.' })
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
        status: 'pending',
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

    // Self-invite: owner must reply YES to activate the group
    const token = randomBytes(32).toString('hex')
    const acceptCode = String(randomInt(1000, 9999))
    const ownerPhone = toE164(userProfile.phone)

    await supabaseAdmin.from('group_invites').insert({
      group_id: data.id,
      invitee_name: userProfile.display_name || userProfile.email || 'Group Owner',
      invitee_phone: ownerPhone,
      token,
      accept_code: acceptCode,
      status: 'pending',
    })

    const smsBody =
      `HoneyText: Reply YES ${acceptCode} to activate your group "${name}". You'll receive weekly discussion questions via text. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`
    try {
      await sendSMS(ownerPhone, smsBody)
    } catch (err: any) {
      console.error('Failed to send activation SMS:', err?.message || err)
      // Group and invite exist; they can use the web link or we could add "resend" later
    }

    res.json({
      ...data,
      status: 'pending',
      conversation_sid: null,
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

// POST /groups/:id/ensure-conversation - Create Twilio Conversation if missing (e.g. owner-only group)
router.post('/:id/ensure-conversation', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const groupId = req.params.id

    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id, conversation_sid, status')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (group.conversation_sid) {
      return res.json({ conversation_sid: group.conversation_sid })
    }

    if (group.status !== 'active') {
      return res.status(400).json({ error: 'Group must be active first' })
    }

    const conversationSid = await ensureGroupConversation(groupId)
    if (!conversationSid) {
      return res.status(400).json({
        error: 'This group has the same members as another group. Invite someone new to start receiving weekly questions via text.',
      })
    }

    const { data: updated } = await supabaseAdmin
      .from('groups')
      .select('conversation_sid')
      .eq('id', groupId)
      .single()

    res.json({ conversation_sid: updated?.conversation_sid ?? conversationSid })
  } catch (error: any) {
    console.error('Error ensuring group conversation:', error)
    res.status(500).json({ error: error.message || 'Failed to set up messaging' })
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

    // Verify ownership and get group name for SMS
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .eq('owner_id', userId)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const canAdd = await checkCanAddMemberToGroup(userId, groupId)
    if (!canAdd) {
      return res.status(400).json({ error: 'Member limit reached. Upgrade to add more.' })
    }

    const token = randomBytes(32).toString('hex')
    const acceptCode = String(randomInt(1000, 9999))
    const normalizedPhone = toE164(invitee_phone)

    const { data, error } = await supabaseAdmin
      .from('group_invites')
      .insert({
        group_id: groupId,
        invitee_name,
        invitee_phone: normalizedPhone,
        token,
        accept_code: acceptCode,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    const origin = process.env.CORS_ORIGIN || 'http://localhost:3000'
    const inviteUrl = `${origin}/invite/${token}`
    const smsBody =
      `HoneyText: You're invited to ${group.name}! You'll get weekly discussion questions via text. Msg & data rates may apply. To join, reply exactly: "YES ${acceptCode}". Reply STOP to opt out, HELP for help.`

    try {
      await sendSMS(normalizedPhone, smsBody)
    } catch (err: any) {
      console.error('Failed to send invite SMS:', err?.message || err)
      // Invite is still created; group owner can share inviteUrl from the app
    }

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

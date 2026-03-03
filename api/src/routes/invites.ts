import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { toE164 } from '../lib/twilio.js'
import { ensureGroupConversation } from '../lib/groupConversation.js'
import { checkCanAddMemberToGroup } from '../lib/subscriptionLimits.js'

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

    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', invite.group_id)
      .single()

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const canAdd = await checkCanAddMemberToGroup(group.owner_id, invite.group_id)
    if (!canAdd) {
      return res.status(400).json({ error: 'Member limit reached for this group. Ask the group owner to upgrade.' })
    }

    // Update invite status
    const { error: updateError } = await supabaseAdmin
      .from('group_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    if (updateError) throw updateError

    let ownerPhone: string | null = null
    if (group?.owner_id) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', group.owner_id)
        .single()
      ownerPhone = owner?.phone ?? null
    }

    const isOwnerSelfInvite =
      ownerPhone && invite.invitee_phone && toE164(ownerPhone) === toE164(invite.invitee_phone)

    if (isOwnerSelfInvite) {
      await supabaseAdmin.from('groups').update({ status: 'active' }).eq('id', invite.group_id)
      await supabaseAdmin.from('group_members').insert({
        group_id: invite.group_id,
        name: invite.invitee_name,
        phone: invite.invitee_phone,
        invite_id: invite.id,
        confirmed_at: new Date().toISOString(),
        is_owner: true,
      })
      try {
        await ensureGroupConversation(invite.group_id)
      } catch (err) {
        console.error('[invites] ensureGroupConversation (owner-only) failed:', err)
      }
    } else {
      await supabaseAdmin.from('group_members').insert({
        group_id: invite.group_id,
        name: invite.invitee_name,
        phone: invite.invitee_phone,
        invite_id: invite.id,
        confirmed_at: new Date().toISOString(),
        is_owner: false,
      })
      await supabaseAdmin.from('groups').update({ status: 'active' }).eq('id', invite.group_id)
      await ensureGroupConversation(invite.group_id)
    }

    res.json({ message: 'Invite accepted successfully' })
  } catch (error: any) {
    console.error('Error accepting invite:', error)
    res.status(500).json({ error: error.message || 'Failed to accept invite' })
  }
})

export default router

import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSMS, toE164 } from '../lib/twilio.js'
import { ensureGroupConversation } from '../lib/groupConversation.js'

const router = express.Router()

// POST /twilio/conversations/webhook
// Handles: (1) Twilio Conversations payload (Group MMS), (2) standard SMS for invite accept (reply YES code)
router.post('/conversations/webhook', async (req, res) => {
  try {
    const {
      ConversationSid,
      ParticipantSid,
      Author,
      Body,
      EventType,
      From,
      To,
    } = req.body

    // (1) Conversations payload (Group MMS)
    if (ConversationSid) {
      if (EventType && EventType !== 'onMessageAdded') {
        return res.status(200).send('ok')
      }
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('id')
        .eq('conversation_sid', ConversationSid)
        .single()
      if (group) {
        await supabaseAdmin.from('group_messages').insert({
          group_id: group.id,
          conversation_sid: ConversationSid,
          participant_sid: ParticipantSid || null,
          author: Author || null,
          body: Body || null,
          direction: 'inbound',
        })
      }
      return res.status(200).send('ok')
    }

    // (2) Standard SMS: invite accept (reply YES <code> from invited phone)
    if (!From || !To || Body == null) {
      return res.status(200).send('ok')
    }
    let fromE164: string
    try {
      fromE164 = toE164(From)
    } catch {
      return res.status(200).send('ok')
    }
    const bodyTrim = String(Body).trim()
    const bodyUpper = bodyTrim.toUpperCase()
    const { data: pendingInvites } = await supabaseAdmin
      .from('group_invites')
      .select('id, group_id, invitee_name, accept_code')
      .eq('invitee_phone', fromE164)
      .eq('status', 'pending')
    const matchingInvite = (pendingInvites || []).find((inv) => {
      const code = String(inv.accept_code || '').trim()
      if (!code) return false
      return bodyUpper === code || bodyUpper === `YES ${code}`
    })
    if (matchingInvite) {
      const invite = matchingInvite
      const { error: updateError } = await supabaseAdmin
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)
      if (updateError) {
        console.error('[webhook] invite accept update failed:', updateError)
        return res.status(200).send('ok')
      }
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('id, name, owner_id')
        .eq('id', invite.group_id)
        .single()
      let ownerPhone: string | null = null
      if (group?.owner_id) {
        const { data: owner } = await supabaseAdmin
          .from('users')
          .select('phone')
          .eq('id', group.owner_id)
          .single()
        ownerPhone = owner?.phone ? toE164(owner.phone) : null
      }
      const isOwnerSelfInvite = ownerPhone === fromE164

      if (isOwnerSelfInvite) {
        // Owner verification: activate group, add owner to group_members (no Twilio yet)
        await supabaseAdmin
          .from('groups')
          .update({ status: 'active' })
          .eq('id', invite.group_id)
        await supabaseAdmin.from('group_members').insert({
          group_id: invite.group_id,
          name: invite.invitee_name,
          phone: fromE164,
          invite_id: invite.id,
          confirmed_at: new Date().toISOString(),
          is_owner: true,
        })
        try {
          await sendSMS(fromE164, `Your group "${group?.name ?? 'Group'}" is now active! Add members and start receiving weekly questions.`)
        } catch (err) {
          console.error('[webhook] owner confirm SMS failed:', err)
        }
        console.log('[webhook] owner verified group via SMS', { invite_id: invite.id, group_id: invite.group_id })
      } else {
        await supabaseAdmin.from('group_members').insert({
          group_id: invite.group_id,
          name: invite.invitee_name,
          phone: fromE164,
          invite_id: invite.id,
          confirmed_at: new Date().toISOString(),
          is_owner: false,
        })
        await supabaseAdmin.from('groups').update({ status: 'active' }).eq('id', invite.group_id)
        try {
          await ensureGroupConversation(invite.group_id)
        } catch (err) {
          console.error('[webhook] ensureGroupConversation failed:', err)
        }
        const groupName = group?.name ?? 'the group'
        try {
          await sendSMS(fromE164, `You're in! You've joined ${groupName}. You'll start receiving weekly questions via text message.`)
        } catch (err) {
          console.error('[webhook] confirm SMS failed:', err)
        }
        console.log('[webhook] invite accepted via SMS', { invite_id: invite.id, group_id: invite.group_id, from: fromE164 })
      }
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

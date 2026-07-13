import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSMS, toE164 } from '../lib/twilio.js'
import { ensureGroupConversation } from '../lib/groupConversation.js'
import { sendMemberJoinedAnnouncement } from '../lib/groupAnnouncements.js'
import { parseConversationWebhookPayload } from '../lib/conversationMessageSync.js'
import {
  isHoneytextAuthor,
  logInboundGroupMessage,
  resolveGroupIdForInboundSms,
} from '../lib/inboundGroupMessage.js'
import { checkCanAddMemberToGroup } from '../lib/subscriptionLimits.js'

const router = express.Router()

// POST /twilio/conversations/webhook
// Handles: (1) Twilio Conversations payload (Group MMS), (2) standard SMS for invite accept (reply YES code)
router.post('/conversations/webhook', async (req, res) => {
  try {
    const payload = parseConversationWebhookPayload(
      (req.body ?? {}) as Record<string, unknown>
    )
    const {
      ConversationSid,
      ParticipantSid,
      Author,
      Body,
      EventType,
      From,
      To,
    } = {
      ConversationSid: payload.conversationSid,
      ParticipantSid: payload.participantSid,
      Author: payload.author,
      Body: payload.messageBody,
      EventType: payload.eventType,
      From: (req.body as Record<string, unknown>)?.From as string | undefined,
      To: (req.body as Record<string, unknown>)?.To as string | undefined,
    }
    const messageSid = payload.messageSid

    // (1) Conversations payload (Group MMS)
    if (ConversationSid) {
      if (EventType && EventType !== 'onMessageAdded') {
        return res.status(200).send('ok')
      }
      if (isHoneytextAuthor(Author)) {
        return res.status(200).send('ok')
      }
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('id')
        .eq('conversation_sid', ConversationSid)
        .single()
      if (group) {
        try {
          await logInboundGroupMessage({
            groupId: group.id,
            conversationSid: ConversationSid,
            participantSid: ParticipantSid || null,
            author: Author || null,
            body: Body || null,
            twilioMessageSid: messageSid,
          })
          console.log('[webhook] logged conversation reply', {
            group_id: group.id,
            conversation_sid: ConversationSid,
            author: Author,
            message_sid: messageSid,
          })
        } catch (err) {
          console.error('[webhook] conversation reply log failed:', err)
        }
      } else {
        console.warn('[webhook] no group for conversation_sid', ConversationSid)
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
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('id, name, owner_id')
        .eq('id', invite.group_id)
        .single()
      if (!group) {
        return res.status(200).send('ok')
      }
      const canAdd = await checkCanAddMemberToGroup(group.owner_id, invite.group_id)
      if (!canAdd) {
        try {
          await sendSMS(fromE164, 'This group has reached its member limit. The owner can upgrade their plan to add you.')
        } catch (err) {
          console.error('[webhook] member limit SMS failed:', err)
        }
        return res.status(200).send('ok')
      }
      const { error: updateError } = await supabaseAdmin
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)
      if (updateError) {
        console.error('[webhook] invite accept update failed:', updateError)
        return res.status(200).send('ok')
      }
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
        // Owner verification: activate group, add owner to group_members, create Conversation so owner gets weekly questions
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
          await ensureGroupConversation(invite.group_id)
        } catch (err) {
          console.error('[webhook] ensureGroupConversation (owner-only) failed:', err)
        }
        try {
          await sendSMS(fromE164, `HoneyText: Your group "${group?.name ?? 'Group'}" is now active! You'll receive weekly discussion questions via text.\n\nMsg & data rates may apply. Reply STOP to opt out. Reply HELP for help.`)
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
          const conversationSid = await ensureGroupConversation(invite.group_id)
          try {
            await sendMemberJoinedAnnouncement(invite.group_id, conversationSid, invite.invitee_name)
          } catch (announceErr) {
            console.error('[webhook] sendMemberJoinedAnnouncement failed:', announceErr)
          }
        } catch (err) {
          console.error('[webhook] ensureGroupConversation failed:', err)
        }
        const groupName = group?.name ?? 'the group'
        try {
          await sendSMS(fromE164, `HoneyText: Welcome! You've joined ${groupName}. You'll receive weekly discussion questions via text.\n\nMsg & data rates may apply. Reply STOP to opt out. Reply HELP for help.`)
        } catch (err) {
          console.error('[webhook] confirm SMS failed:', err)
        }
        console.log('[webhook] invite accepted via SMS', { invite_id: invite.id, group_id: invite.group_id, from: fromE164 })
      }
    } else {
      // (3) Standard SMS reply from a group member (e.g. 1:1 thread with Twilio number)
      const groupId = await resolveGroupIdForInboundSms(fromE164)
      if (groupId && bodyTrim.length > 0) {
        try {
          await logInboundGroupMessage({
            groupId,
            author: fromE164,
            body: bodyTrim,
          })
          console.log('[webhook] logged SMS reply', { group_id: groupId, from: fromE164 })
        } catch (err) {
          console.error('[webhook] SMS reply log failed:', err)
        }
      }
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

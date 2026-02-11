import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSMS, toE164, addSmsParticipant } from '../lib/twilio.js'

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
        .select('id, name, conversation_sid')
        .eq('id', invite.group_id)
        .single()
      let participantSid: string | null = null
      if (group?.conversation_sid) {
        try {
          const participant = await addSmsParticipant(group.conversation_sid, fromE164)
          participantSid = participant.sid
        } catch (err) {
          console.error('[webhook] addSmsParticipant failed:', err)
        }
      }
      const { error: memberError } = await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: invite.group_id,
          name: invite.invitee_name,
          phone: fromE164,
          invite_id: invite.id,
          confirmed_at: new Date().toISOString(),
          participant_sid: participantSid,
          is_owner: false,
        })
      if (memberError) {
        console.error('[webhook] invite accept insert member failed:', memberError)
        return res.status(200).send('ok')
      }
      const groupName = group?.name ?? 'the group'
      try {
        await sendSMS(fromE164, `You're in! You've joined ${groupName}. You'll start receiving weekly questions via text message.`)
      } catch (err) {
        console.error('[webhook] confirm SMS failed:', err)
      }
      console.log('[webhook] invite accepted via SMS', { invite_id: invite.id, group_id: invite.group_id, from: fromE164 })
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

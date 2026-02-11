import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSMS, toE164, addSmsParticipant } from '../lib/twilio.js'

const router = express.Router()

// POST /twilio/conversations/webhook
// Handles both: (1) Twilio Conversations payload (Group MMS), (2) standard SMS payload (one-to-one replies)
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

    // (2) Standard SMS payload (one-to-one reply): From = sender, To = our number
    if (!From || !To || Body == null) {
      return res.status(200).send('ok')
    }
    let fromE164: string
    let toE164Num: string
    try {
      fromE164 = toE164(From)
      toE164Num = toE164(To)
    } catch {
      return res.status(200).send('ok')
    }
    const { data: context } = await supabaseAdmin
      .from('one_to_one_send_context')
      .select('group_id')
      .eq('twilio_number', toE164Num)
      .eq('recipient_phone', fromE164)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!context?.group_id) {
      // (3) Invite accept via SMS: From must be invitee_phone, body must contain accept_code
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
          await sendSMS(fromE164, `You're in! You've joined ${groupName}.`)
        } catch (err) {
          console.error('[webhook] confirm SMS failed:', err)
        }
        console.log('[webhook] invite accepted via SMS', { invite_id: invite.id, group_id: invite.group_id, from: fromE164 })
        return res.status(200).send('ok')
      }
      console.log('[webhook] inbound one-to-one: no context for', { to: toE164Num, from: fromE164 })
      return res.status(200).send('ok')
    }
    const groupId = context.group_id

    const { data: membersForGroup } = await supabaseAdmin
      .from('group_members')
      .select('name, phone')
      .eq('group_id', groupId)
    const authorMember = (membersForGroup || []).find(
      (m) => m.phone && toE164(m.phone) === fromE164
    )
    const authorName = authorMember?.name || fromE164

    await supabaseAdmin.from('group_messages').insert({
      group_id: groupId,
      conversation_sid: null,
      participant_sid: null,
      author: authorName,
      body: Body,
      direction: 'inbound',
    })

    const otherMembers = (membersForGroup || []).filter(
      (m) => m.phone && toE164(m.phone) !== fromE164
    )

    console.log('[webhook] inbound one-to-one received', {
      group_id: groupId,
      from: fromE164,
      author: authorName,
      body_preview: String(Body).slice(0, 50),
      relay_to_count: otherMembers.length,
      relay_to_phones: otherMembers.map((m) => m.phone),
    })

    const relayBody = `${authorName}: ${Body}`
    for (const m of otherMembers || []) {
      if (!m.phone) continue
      try {
        await sendSMS(m.phone, relayBody)
        console.log('[webhook] relay sent to', m.phone)
      } catch (err) {
        console.error('[webhook] relay to', m.phone, 'failed:', err)
      }
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

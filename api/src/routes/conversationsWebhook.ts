import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSMS, toE164 } from '../lib/twilio.js'

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

    const relayBody = `${authorName}: ${Body}`
    for (const m of otherMembers || []) {
      if (!m.phone) continue
      try {
        await sendSMS(m.phone, relayBody)
      } catch (err) {
        console.error(`[webhook] relay to ${m.phone} failed:`, err)
      }
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

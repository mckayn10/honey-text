import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const router = express.Router()

// POST /twilio/conversations/webhook
router.post('/conversations/webhook', async (req, res) => {
  try {
    const {
      ConversationSid,
      ParticipantSid,
      Author,
      Body,
      EventType,
    } = req.body

    if (!ConversationSid) {
      return res.status(400).json({ error: 'Missing ConversationSid' })
    }

    // Only log message events
    if (EventType && EventType !== 'onMessageAdded') {
      return res.status(200).send('ok')
    }

    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('conversation_sid', ConversationSid)
      .single()

    if (group) {
      await supabaseAdmin
        .from('group_messages')
        .insert({
          group_id: group.id,
          conversation_sid: ConversationSid,
          participant_sid: ParticipantSid || null,
          author: Author || null,
          body: Body || null,
          direction: 'inbound',
        })
    }

    res.status(200).send('ok')
  } catch (error) {
    console.error('Conversations webhook error:', error)
    res.status(200).send('ok')
  }
})

export default router

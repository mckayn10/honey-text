import { supabaseAdmin } from './supabase.js'
import { isHoneytextAuthor } from './inboundGroupMessage.js'
import { listConversationMessages } from './twilio.js'

/**
 * Pull messages from Twilio Conversations into group_messages so the app UI stays
 * in sync even when webhooks are misconfigured or missed.
 */
export async function syncConversationMessagesFromTwilio(
  groupId: string,
  conversationSid: string
): Promise<void> {
  const twilioMessages = await listConversationMessages(conversationSid, 100)

  for (const msg of twilioMessages) {
    const sid = msg.sid
    const body = msg.body ?? ''
    const author = msg.author ?? null
    if (!sid || !body.trim()) continue

    const { data: existingBySid } = await supabaseAdmin
      .from('group_messages')
      .select('id')
      .eq('twilio_message_sid', sid)
      .maybeSingle()
    if (existingBySid) continue

    const direction = isHoneytextAuthor(author) ? 'outbound' : 'inbound'
    const createdAt =
      msg.dateCreated instanceof Date
        ? msg.dateCreated.toISOString()
        : msg.dateCreated
          ? new Date(msg.dateCreated).toISOString()
          : new Date().toISOString()

    if (direction === 'outbound') {
      const { data: existingByBody } = await supabaseAdmin
        .from('group_messages')
        .select('id')
        .eq('group_id', groupId)
        .eq('direction', 'outbound')
        .eq('body', body)
        .maybeSingle()
      if (existingByBody) {
        await supabaseAdmin
          .from('group_messages')
          .update({ twilio_message_sid: sid })
          .eq('id', existingByBody.id)
        continue
      }
    }

    const { error } = await supabaseAdmin.from('group_messages').insert({
      group_id: groupId,
      conversation_sid: conversationSid,
      author: direction === 'outbound' ? 'honeytext' : author,
      body,
      direction,
      twilio_message_sid: sid,
      created_at: createdAt,
    })

    if (error && !/duplicate|unique/i.test(error.message || '')) {
      console.error('[conversationMessageSync] insert failed:', error.message || error)
    }
  }
}

/** Normalize Twilio webhook bodies (form or JSON, PascalCase or camelCase). */
export function parseConversationWebhookPayload(body: Record<string, unknown>) {
  const nested =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : null
  const source = nested ?? body

  return {
    conversationSid: String(
      source.ConversationSid ?? source.conversationSid ?? body.ConversationSid ?? ''
    ).trim() || null,
    eventType: String(source.EventType ?? source.eventType ?? body.EventType ?? '').trim() || null,
    author: String(source.Author ?? source.author ?? '').trim() || null,
    messageBody: String(
      source.Body ?? source.body ?? source.MessageBody ?? source.messageBody ?? ''
    ).trim() || null,
    participantSid: String(source.ParticipantSid ?? source.participantSid ?? '').trim() || null,
    messageSid: String(source.MessageSid ?? source.messageSid ?? '').trim() || null,
  }
}

import { supabaseAdmin } from './supabase.js'
import { toE164 } from './twilio.js'

export function isHoneytextAuthor(author: string | null | undefined): boolean {
  const a = (author || '').trim()
  return a === 'honeytext' || a.startsWith('honeytext-')
}

/** Active group(s) this phone belongs to (confirmed member or owner). */
export async function resolveGroupIdForInboundSms(phone: string): Promise<string | null> {
  const e164 = toE164(phone)
  const groupIds = new Set<string>()

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('phone', e164)

  for (const m of members || []) {
    if (!m.group_id) continue
    const { data: g } = await supabaseAdmin
      .from('groups')
      .select('status')
      .eq('id', m.group_id)
      .single()
    if (g?.status === 'active') groupIds.add(m.group_id)
  }

  const { data: activeGroups } = await supabaseAdmin
    .from('groups')
    .select('id, owner_id')
    .eq('status', 'active')

  for (const g of activeGroups || []) {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('phone')
      .eq('id', g.owner_id)
      .single()
    if (owner?.phone && toE164(owner.phone) === e164) {
      groupIds.add(g.id)
    }
  }

  if (groupIds.size === 0) return null
  if (groupIds.size === 1) return [...groupIds][0]

  const ids = [...groupIds]
  const { data: recent } = await supabaseAdmin
    .from('group_messages')
    .select('group_id')
    .in('group_id', ids)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return recent?.group_id ?? ids[0]
}

export async function logInboundGroupMessage(params: {
  groupId: string
  conversationSid?: string | null
  participantSid?: string | null
  author?: string | null
  body?: string | null
  twilioMessageSid?: string | null
  createdAt?: string | null
}): Promise<void> {
  if (params.twilioMessageSid) {
    const { data: existing } = await supabaseAdmin
      .from('group_messages')
      .select('id')
      .eq('twilio_message_sid', params.twilioMessageSid)
      .maybeSingle()
    if (existing) return
  }

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('conversation_sid')
    .eq('id', params.groupId)
    .single()

  const row: Record<string, unknown> = {
    group_id: params.groupId,
    conversation_sid: params.conversationSid ?? group?.conversation_sid ?? null,
    participant_sid: params.participantSid ?? null,
    author: params.author ?? null,
    body: params.body ?? null,
    direction: 'inbound',
  }
  if (params.twilioMessageSid) row.twilio_message_sid = params.twilioMessageSid
  if (params.createdAt) row.created_at = params.createdAt

  const { error } = await supabaseAdmin.from('group_messages').insert(row)

  if (error) {
    console.error('[inboundGroupMessage] insert failed:', error.message || error)
    throw error
  }
}

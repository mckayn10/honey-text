import { supabaseAdmin } from './supabase.js'
import {
  createConversation,
  addProjectedParticipant,
  addSmsParticipant,
  ensureConversationMessagingServiceSid,
  listConversationSmsPhones,
  toE164,
} from './twilio.js'

/**
 * Get the set of E.164 phone numbers for a group (owner + all confirmed members).
 */
async function getGroupMemberPhones(groupId: string): Promise<Set<string>> {
  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single()
  if (!group) return new Set()

  const phones = new Set<string>()

  const { data: owner } = await supabaseAdmin
    .from('users')
    .select('phone')
    .eq('id', group.owner_id)
    .single()
  if (owner?.phone) phones.add(toE164(owner.phone))

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('phone')
    .eq('group_id', groupId)
  for (const m of members || []) {
    if (m.phone) phones.add(toE164(m.phone))
  }

  return phones
}

/**
 * Check if another group (with a conversation) has the exact same member set.
 * Avoids Twilio 50438 by not creating until the set is unique.
 * Single-participant (owner-only) groups are always allowed so each can have its own thread.
 */
async function hasDuplicateMemberSet(groupId: string, memberPhones: Set<string>): Promise<boolean> {
  if (memberPhones.size === 0) return false
  if (memberPhones.size === 1) return false // owner-only: each group gets its own Conversation

  const { data: otherGroups } = await supabaseAdmin
    .from('groups')
    .select('id')
    .not('id', 'eq', groupId)
    .not('conversation_sid', 'is', null)

  for (const g of otherGroups || []) {
    const otherPhones = await getGroupMemberPhones(g.id)
    if (otherPhones.size !== memberPhones.size) continue
    const match = [...memberPhones].every((p) => otherPhones.has(p))
    if (match) return true
  }
  return false
}

/**
 * Add any confirmed member phones missing from an existing Twilio Conversation.
 * Conversations are often created when only the owner has joined; later members must be synced.
 */
async function syncConversationParticipants(
  groupId: string,
  conversationSid: string,
  ownerId: string
): Promise<void> {
  const memberPhones = await getGroupMemberPhones(groupId)
  if (memberPhones.size === 0) return

  const existingPhones = await listConversationSmsPhones(conversationSid)
  const missingPhones = [...memberPhones].filter((p) => !existingPhones.has(p))
  if (missingPhones.length === 0) return

  const { data: owner } = await supabaseAdmin
    .from('users')
    .select('display_name, email, phone')
    .eq('id', ownerId)
    .single()

  const otherGroupPhones = new Set<string>()
  const { data: otherGroups } = await supabaseAdmin
    .from('groups')
    .select('id')
    .not('id', 'eq', groupId)
    .not('conversation_sid', 'is', null)
  for (const g of otherGroups || []) {
    const pm = await getGroupMemberPhones(g.id)
    pm.forEach((p) => otherGroupPhones.add(p))
  }

  const uniquePhones = missingPhones.filter((p) => !otherGroupPhones.has(p))
  const restPhones = missingPhones.filter((p) => otherGroupPhones.has(p))
  const addOrder = [...uniquePhones, ...restPhones]

  const { data: allMembers } = await supabaseAdmin
    .from('group_members')
    .select('id, phone')
    .eq('group_id', groupId)

  for (const phone of addOrder) {
    const participant = await addSmsParticipant(conversationSid, phone)
    const isOwner = owner?.phone && toE164(owner.phone) === phone
    const existingMember = (allMembers || []).find((m) => m.phone && toE164(m.phone) === phone)

    if (!existingMember && isOwner) {
      await supabaseAdmin.from('group_members').insert({
        group_id: groupId,
        name: owner!.display_name || owner!.email || 'Group Owner',
        phone,
        confirmed_at: new Date().toISOString(),
        participant_sid: participant.sid,
        is_owner: true,
      })
    } else if (existingMember) {
      await supabaseAdmin
        .from('group_members')
        .update({ participant_sid: participant.sid, is_owner: isOwner })
        .eq('id', existingMember.id)
    }
  }
}

/**
 * Ensure a group has a Twilio Conversation. Creates only when member set is unique.
 * Deferred creation avoids Twilio 50438 and keeps each group in its own MMS thread.
 */
export async function ensureGroupConversation(groupId: string): Promise<string | null> {
  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('id, name, owner_id, conversation_sid')
    .eq('id', groupId)
    .single()

  if (groupError || !group) return null
  if (group.conversation_sid) {
    try {
      await ensureConversationMessagingServiceSid(group.conversation_sid)
    } catch (err) {
      console.error(
        '[groupConversation] ensureConversationMessagingServiceSid failed:',
        (err as Error)?.message || err
      )
    }
    try {
      await syncConversationParticipants(groupId, group.conversation_sid, group.owner_id)
    } catch (err) {
      console.error(
        '[groupConversation] syncConversationParticipants failed:',
        (err as Error)?.message || err
      )
      throw err
    }
    return group.conversation_sid
  }

  const memberPhones = await getGroupMemberPhones(groupId)
  if (memberPhones.size === 0) return null

  if (await hasDuplicateMemberSet(groupId, memberPhones)) {
    return null
  }

  const conversation = await createConversation(group.name)
  try {
    await addProjectedParticipant(conversation.sid, `honeytext-${group.id}`)
  } catch (twilioErr: any) {
    if (twilioErr?.code === 50407) {
      throw new Error(
        'Invalid Twilio number for Group MMS. Set TWILIO_PHONE_NUMBER in api/.env to a US/Canada long code you own in Twilio (E.164, e.g. +15551234567).'
      )
    }
    throw twilioErr
  }

  await supabaseAdmin
    .from('groups')
    .update({ conversation_sid: conversation.sid })
    .eq('id', groupId)

  const { data: owner } = await supabaseAdmin
    .from('users')
    .select('display_name, email, phone')
    .eq('id', group.owner_id)
    .single()

  const otherGroupPhones = new Set<string>()
  const { data: otherGroups } = await supabaseAdmin
    .from('groups')
    .select('id')
    .not('id', 'eq', groupId)
    .not('conversation_sid', 'is', null)
  for (const g of otherGroups || []) {
    const pm = await getGroupMemberPhones(g.id)
    pm.forEach((p) => otherGroupPhones.add(p))
  }

  const uniquePhones = [...memberPhones].filter((p) => !otherGroupPhones.has(p))
  const restPhones = [...memberPhones].filter((p) => otherGroupPhones.has(p))
  const addOrder = [...uniquePhones, ...restPhones]
  const { data: allMembers } = await supabaseAdmin
    .from('group_members')
    .select('id, phone')
    .eq('group_id', groupId)

  for (const phone of addOrder) {
    const participant = await addSmsParticipant(conversation.sid, phone)
    const isOwner = owner?.phone && toE164(owner.phone) === phone
    const existingMember = (allMembers || []).find((m) => m.phone && toE164(m.phone) === phone)

    if (!existingMember && isOwner) {
      await supabaseAdmin.from('group_members').insert({
        group_id: groupId,
        name: owner!.display_name || owner!.email || 'Group Owner',
        phone,
        confirmed_at: new Date().toISOString(),
        participant_sid: participant.sid,
        is_owner: true,
      })
    } else if (existingMember) {
      await supabaseAdmin
        .from('group_members')
        .update({ participant_sid: participant.sid, is_owner: isOwner })
        .eq('id', existingMember.id)
    }
  }

  return conversation.sid
}

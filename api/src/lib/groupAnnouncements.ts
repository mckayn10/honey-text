import { sendConversationMessage } from './twilio.js'

function formatJoinNotice(memberName?: string | null): string {
  const name = (memberName || '').trim()
  if (!name) return 'A new member joined this group.'
  return `${name} joined this group.`
}

/**
 * Notify all participants in the group's Conversation that a member joined.
 * This posts into the existing Conversation thread so it reaches all members together.
 */
export async function sendMemberJoinedAnnouncement(
  groupId: string,
  conversationSid: string | null | undefined,
  memberName?: string | null
): Promise<void> {
  if (!conversationSid) return
  const authorIdentity = `honeytext-${groupId}`
  const body = formatJoinNotice(memberName)
  await sendConversationMessage(conversationSid, body, authorIdentity)
}

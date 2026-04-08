import twilio, { Twilio } from 'twilio'

let twilioClient: Twilio | null = null

const E164_REGEX = /^\+[1-9]\d{10,14}$/

/** Normalize a phone number to E.164 (e.g. +15551234567). Twilio requires this for messaging bindings. */
export function toE164(phone: string): string {
  const trimmed = (phone || '').trim()
  if (!trimmed) {
    throw new Error('Phone number is empty')
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+1${digits}` // US/Canada
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (trimmed.startsWith('+')) {
    const out = '+' + trimmed.replace(/\D/g, '')
    if (!E164_REGEX.test(out)) {
      throw new Error(`Invalid E.164: "${phone}" → "${out}" (need + and 11–15 digits)`)
    }
    return out
  }
  const out = `+${digits}`
  if (!E164_REGEX.test(out)) {
    throw new Error(`Invalid phone: "${phone}" → "${out}" (use E.164, e.g. +15551234567)`)
  }
  return out
}

function getTwilioClient(): Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio environment variables')
    }
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

export function getTwilioNumber(): string {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  if (!fromNumber) {
    throw new Error('Missing TWILIO_PHONE_NUMBER')
  }
  const e164 = toE164(fromNumber)
  // US/Canada long code required for Group MMS (Conversation).
  if (!e164.startsWith('+1') || e164.length !== 12) {
    throw new Error(
      'TWILIO_PHONE_NUMBER must be a US/Canada number in E.164 (e.g. +15551234567 or +18005551234).'
    )
  }
  return e164
}

export async function sendSMS(to: string, message: string) {
  const client = getTwilioClient()
  const fromNumber = getTwilioNumber()
  const toE164Address = toE164(to)
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toE164Address,
    })
    return result
  } catch (error) {
    console.error('Failed to send SMS:', error)
    throw error
  }
}

const MG_SID_REGEX = /^MG[0-9a-f]{32}$/i

/**
 * Create a Twilio Conversation for Group MMS.
 * Pass TWILIO_MESSAGING_SERVICE_SID (your A2P-linked Messaging Service, e.g. MG…) so SMS
 * participants share one group thread; without it, Twilio may deliver as separate 1:1 SMS.
 */
export async function createConversation(friendlyName: string) {
  const client = getTwilioClient()
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  const params: { friendlyName: string; messagingServiceSid?: string } = {
    friendlyName,
  }
  if (messagingServiceSid && MG_SID_REGEX.test(messagingServiceSid)) {
    params.messagingServiceSid = messagingServiceSid
  } else if (messagingServiceSid && !MG_SID_REGEX.test(messagingServiceSid)) {
    console.warn(
      '[twilio] TWILIO_MESSAGING_SERVICE_SID is set but invalid (expected MG + 32 hex). Ignoring.'
    )
  }
  const created = await client.conversations.v1.conversations.create(params)
  if (messagingServiceSid && MG_SID_REGEX.test(messagingServiceSid)) {
    const bound = (created as { messagingServiceSid?: string }).messagingServiceSid
    if (!bound) {
      console.warn(
        `[twilio] Conversation ${created.sid} created without messagingServiceSid in response; binding with update.`
      )
      await client.conversations.v1.conversations(created.sid).update({
        messagingServiceSid,
      })
    }
  }
  return created
}

/**
 * If TWILIO_MESSAGING_SERVICE_SID is set, ensure the Twilio Conversation is bound to it.
 * Conversations created before this env var existed (or before the API loaded it) stay
 * unbound otherwise, and Group MMS may fall back to separate 1:1 SMS.
 */
export async function ensureConversationMessagingServiceSid(conversationSid: string): Promise<void> {
  const client = getTwilioClient()
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  if (!messagingServiceSid || !MG_SID_REGEX.test(messagingServiceSid)) {
    return
  }

  const conv = await client.conversations.v1.conversations(conversationSid).fetch()
  const current = (conv as { messagingServiceSid?: string | null }).messagingServiceSid || null
  if (current === messagingServiceSid) return

  if (current) {
    console.warn(
      `[twilio] Conversation ${conversationSid} is bound to messaging service ${current}; env has ${messagingServiceSid}. Not overwriting.`
    )
    return
  }

  await client.conversations.v1.conversations(conversationSid).update({
    messagingServiceSid,
  })
  console.log(
    `[twilio] Bound conversation ${conversationSid} to messaging service ${messagingServiceSid} (was unbound).`
  )
}

export async function addProjectedParticipant(conversationSid: string, identity: string) {
  const client = getTwilioClient()
  const projectedAddress = getTwilioNumber()
  return client.conversations.v1
    .conversations(conversationSid)
    .participants.create({
      identity,
      'messagingBinding.projectedAddress': projectedAddress,
    })
}

/** True when the Conversation SID is invalid in this Twilio account (e.g. after switching subaccounts). */
export function isStaleTwilioConversationError(err: unknown): boolean {
  const e = err as { code?: number; status?: number; message?: string }
  // 20404 = Twilio REST "not found" for missing resource
  if (e?.code === 20404 || e?.status === 404) return true
  const msg = String(e?.message || '')
  if (!/not found/i.test(msg)) return false
  return /conversation|participant|Participants/i.test(msg)
}

export async function addSmsParticipant(conversationSid: string, phone: string) {
  const client = getTwilioClient()
  return client.conversations.v1
    .conversations(conversationSid)
    .participants.create({
      'messagingBinding.address': toE164(phone),
    })
}

export async function removeParticipant(conversationSid: string, participantSid: string) {
  const client = getTwilioClient()
  return client.conversations.v1
    .conversations(conversationSid)
    .participants(participantSid)
    .remove()
}

/**
 * Send a message to a Conversation. For Group MMS, author must be the identity of the
 * participant that has the projected address (our Twilio number), e.g. "honeytext-{group.id}".
 */
export async function sendConversationMessage(
  conversationSid: string,
  body: string,
  author: string
) {
  const client = getTwilioClient()
  return client.conversations.v1
    .conversations(conversationSid)
    .messages.create({ author, body })
}

export async function deleteConversation(conversationSid: string) {
  const client = getTwilioClient()
  return client.conversations.v1
    .conversations(conversationSid)
    .remove()
}

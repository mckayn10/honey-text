/**
 * US +1 numbers only. Store/send digits only (e.g. 1111111111). Display as (111) 111-1111.
 */

/** Strip to digits and normalize to 10 digits for US (drop leading 1 if 11 digits). For API/storage. */
export function parsePhoneToDigits(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits.slice(0, 10)
}

/** Format 0–10 digits for display in an input as user types (e.g. 1111111 → (111) 111-1). */
export function formatPhoneForInput(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length === 3) return `(${d})`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Format a phone string for read-only display (e.g. 1111111111 or +11111111111 → (111) 111-1111). */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (phone == null || phone === '') return ''
  const digits = parsePhoneToDigits(phone)
  if (digits.length !== 10) return phone
  return formatPhoneForInput(digits)
}

/**
 * Single source of truth for subscription tiers.
 * To change limits or display: edit this file.
 * To change Stripe price: create new Price in Dashboard, update env var.
 */

export interface TierConfig {
  tier: string
  priceId: string
  maxGroups: number
  maxMembersPerGroup: number
  label: string
  priceDisplay: string
}

const TIER_CONFIG_RAW: Omit<TierConfig, 'priceId'>[] = [
  { tier: 'starter', maxGroups: 1, maxMembersPerGroup: 5, label: 'Starter', priceDisplay: '$5/mo' },
  { tier: 'pro', maxGroups: 5, maxMembersPerGroup: 10, label: 'Pro', priceDisplay: '$12/mo' },
  { tier: 'team', maxGroups: 15, maxMembersPerGroup: 15, label: 'Team', priceDisplay: '$25/mo' },
]

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || '',
}

export const TIER_CONFIG: TierConfig[] = TIER_CONFIG_RAW
  .filter((t) => PRICE_IDS[t.tier])
  .map((t) => ({ ...t, priceId: PRICE_IDS[t.tier] }))

export function getAllowedPriceIds(): string[] {
  return TIER_CONFIG.map((t) => t.priceId).filter(Boolean)
}

export function getTierByPriceId(priceId: string): string | null {
  const found = TIER_CONFIG.find((t) => t.priceId === priceId)
  return found ? found.tier : null
}

export function getPlansForFrontend(): Array<Omit<TierConfig, 'priceId'> & { priceId: string }> {
  return TIER_CONFIG.map(({ priceId, ...rest }) => ({ ...rest, priceId }))
}

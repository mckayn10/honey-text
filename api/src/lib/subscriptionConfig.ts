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

/** Free trial length for new paid subscriptions (card collected upfront via SetupIntent, first charge after this many days). */
export const TRIAL_PERIOD_DAYS = 14

/**
 * Special tier granted by redeeming BETA_PROMO_CODE. Not part of TIER_CONFIG (so it never
 * appears as a purchasable plan) and has no Stripe price — see getTierLimits' special case.
 */
export const BETA_TIER = 'beta'

const TIER_CONFIG_RAW: Omit<TierConfig, 'priceId'>[] = [
  { tier: 'basic', maxGroups: 1, maxMembersPerGroup: 5, label: 'Basic', priceDisplay: '$5/month' },
  { tier: 'pro', maxGroups: 3, maxMembersPerGroup: 5, label: 'Pro', priceDisplay: '$10/month' },
  { tier: 'premium', maxGroups: 10, maxMembersPerGroup: 10, label: 'Premium', priceDisplay: '$20/month' },
]

// Set each in api/.env; tiers with no price ID are omitted from GET /billing/plans
const PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
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

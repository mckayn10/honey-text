-- Track when a user redeemed the beta/promo code (subscription_tier is set to 'beta' on redemption)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS beta_redeemed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.beta_redeemed_at IS 'Set when the user redeems the BETA_PROMO_CODE; subscription_tier is set to ''beta'' (unlimited access, no Stripe subscription) at the same time.';

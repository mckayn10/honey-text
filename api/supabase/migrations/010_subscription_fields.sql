-- Subscription fields for Stripe billing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'Stripe Subscription ID when active';
COMMENT ON COLUMN public.users.subscription_tier IS 'Tier name from subscription config; null = no active subscription';

# Stripe Account Setup for HoneyText

This guide walks through configuring Stripe for HoneyText subscriptions. Complete these steps in the [Stripe Dashboard](https://dashboard.stripe.com).

## Prerequisites

- Stripe account ([sign up](https://dashboard.stripe.com/register) if needed)
- Stripe account in **Live** mode for production, or **Test** mode for development

---

## 1. Create Products and Prices

Subscriptions charge the customer when they select a tier (no free trial). The first invoice must have an amount due so Stripe creates a PaymentIntent and we can show the card form.

1. Go to **Products** → **Add product**
2. Create each product with **no free trial**:

### Basic
- **Name:** Basic
- **Description:** 1 group, 5 members per group
- **Pricing:** Standard pricing → **Recurring** → **Monthly** → **$5** (or your amount)
- **Do not** add a free trial to the price
- Save and copy the **Price ID** (starts with `price_`) → set as `STRIPE_BASIC_PRICE_ID`

### Pro
- **Name:** Pro
- **Description:** 3 groups, 5 members per group
- **Pricing:** Recurring, Monthly, **$10** — **no free trial**
- Copy the **Price ID** → set as `STRIPE_PRO_PRICE_ID`

### Premium
- **Name:** Premium
- **Description:** 10 groups, 10 members per group
- **Pricing:** Recurring, Monthly, **$20** — **no free trial**
- Copy the **Price ID** → set as `STRIPE_PREMIUM_PRICE_ID`

**If you get "Could not create payment intent":** In Stripe, edit the Price (or create a new one) and ensure there is **no default free trial** on the product/price. The first invoice must charge immediately so we can collect the card.

---

## 2. Get API Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

Add to your environment:

| Variable | Location | Value |
|----------|----------|-------|
| `STRIPE_SECRET_KEY` | `api/.env` | Secret key |
| `STRIPE_BASIC_PRICE_ID` | `api/.env` | Basic price ID |
| `STRIPE_PRO_PRICE_ID` | `api/.env` | Pro price ID |
| `STRIPE_PREMIUM_PRICE_ID` | `api/.env` | Premium price ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `app/.env` | Publishable key |

Tiers without a price ID in env are not returned by `GET /billing/plans`. Add all three if you want Basic, Pro, and Premium to appear.

---

## 3. Configure Webhook (Production)

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://your-api-domain.com/webhook` (the API mounts the Stripe webhook at `/webhook`)
3. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` (optional)
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `api/.env`:
   - `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 4. Local Development Webhook

For local testing, use the Stripe CLI:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3001/webhook
```

The CLI prints a webhook signing secret (e.g. `whsec_...`). Use this for `STRIPE_WEBHOOK_SECRET` in local `api/.env`. The CLI forwards Stripe events to your local server.

---

## 5. Test Mode vs Live Mode

- **Test mode:** Use test cards (e.g. `4242 4242 4242 4242`). No real charges.
- **Live mode:** Toggle in Dashboard header. Requires business verification for production.
- Ensure API keys and webhook secrets match the mode you're using.

---

## 6. Customer Portal (Optional)

To let customers manage their subscription (update card, cancel):

1. Go to **Settings** → **Billing** → **Customer portal**
2. Configure branding and allowed actions
3. The portal URL is generated when you create a session via the API

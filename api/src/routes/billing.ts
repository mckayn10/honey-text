import express from 'express'
import Stripe from 'stripe'
import { authenticateUser, AuthRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import {
  getPlansForFrontend,
  getAllowedPriceIds,
  getTierByPriceId,
} from '../lib/subscriptionConfig.js'

const router = express.Router()
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// GET /billing/plans - Tier config for frontend (auth optional)
router.get('/plans', (_req, res) => {
  try {
    const plans = getPlansForFrontend()
    res.json(plans)
  } catch (error: any) {
    console.error('Error fetching plans:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch plans' })
  }
})

// GET /billing/status - Current user subscription (auth required)
router.get('/status', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single()

    if (error) throw error

    let subscription_status: string | null = null
    if (user?.stripe_subscription_id && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id)
        subscription_status = sub.status
      } catch {
        subscription_status = null
      }
    }

    res.json({
      subscription_tier: user?.subscription_tier ?? null,
      stripe_customer_id: user?.stripe_customer_id ?? null,
      subscription_status,
    })
  } catch (error: any) {
    console.error('Error fetching billing status:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch billing status' })
  }
})

// POST /billing/create-subscription - Start subscription, return client_secret for Payment Element
router.post('/create-subscription', authenticateUser, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Billing is not configured' })
    }

    const userId = req.user!.id
    const { price_id } = req.body

    if (!price_id || typeof price_id !== 'string') {
      return res.status(400).json({ error: 'Missing price_id' })
    }

    const allowedIds = getAllowedPriceIds()
    if (!allowedIds.includes(price_id)) {
      return res.status(400).json({ error: 'Invalid price' })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!user?.email) {
      return res.status(400).json({ error: 'User email required' })
    }

    let customerId = user.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { supabase_user_id: userId },
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }
    const paymentIntent = invoice?.payment_intent
    const client_secret = paymentIntent?.client_secret ?? null

    if (!client_secret) {
      return res.status(500).json({ error: 'Could not create payment intent' })
    }

    res.json({ client_secret, subscription_id: subscription.id })
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    res.status(500).json({ error: error.message || 'Failed to create subscription' })
  }
})

// POST /billing/confirm-subscription - After frontend confirms payment, sync tier
router.post('/confirm-subscription', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { subscription_id } = req.body

    if (!subscription_id || typeof subscription_id !== 'string') {
      return res.status(400).json({ error: 'Missing subscription_id' })
    }

    if (stripe) {
      const sub = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ['items.data.price'],
      })
      if (sub.metadata?.supabase_user_id !== userId) {
        return res.status(403).json({ error: 'Subscription does not belong to user' })
      }
      const priceId = sub.items?.data?.[0]?.price?.id
      const tier = priceId ? getTierByPriceId(priceId) : null
      await supabaseAdmin
        .from('users')
        .update({ stripe_subscription_id: subscription_id, subscription_tier: tier })
        .eq('id', userId)
    }

    const { data: updated } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', userId)
      .single()

    res.json({
      subscription_tier: updated?.subscription_tier ?? null,
      stripe_subscription_id: updated?.stripe_subscription_id ?? null,
      subscription_status: 'active',
    })
  } catch (error: any) {
    console.error('Error confirming subscription:', error)
    res.status(500).json({ error: error.message || 'Failed to confirm subscription' })
  }
})

// POST /billing/portal - Stripe Customer Portal URL for managing subscription
router.post('/portal', authenticateUser, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Billing is not configured' })
    }

    const userId = req.user!.id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing customer found. Subscribe first.' })
    }

    const origin = process.env.CORS_ORIGIN || 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/app/subscribe`,
    })

    res.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    res.status(500).json({ error: error.message || 'Failed to create portal session' })
  }
})

export default router

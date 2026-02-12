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
      expand: ['latest_invoice', 'latest_invoice.payment_intent', 'latest_invoice.confirmation_secret'],
      metadata: { supabase_user_id: userId },
    })

    let client_secret: string | null = null
    const rawInvoice = subscription.latest_invoice
    const invoiceId = typeof rawInvoice === 'string' ? rawInvoice : (rawInvoice as Stripe.Invoice)?.id

    // Prefer confirmation_secret (Stripe's field for Payment Element; has client_secret even when payment_intent is null on invoice)
    const getClientSecretFromInvoice = (inv: Stripe.Invoice): string | null => {
      const cs = (inv as Stripe.Invoice & { confirmation_secret?: { client_secret: string } }).confirmation_secret
      if (typeof cs === 'object' && cs?.client_secret) return cs.client_secret
      const pi = (inv as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string }).payment_intent
      if (typeof pi === 'object' && pi?.client_secret) return pi.client_secret
      if (typeof pi === 'string' && pi) return null // caller can retrieve by id
      return null
    }

    if (typeof rawInvoice === 'string') {
      const invoice = await stripe.invoices.retrieve(rawInvoice, {
        expand: ['payment_intent', 'confirmation_secret'],
      }) as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent; confirmation_secret?: { client_secret: string } }
      client_secret = getClientSecretFromInvoice(invoice)
      if (!client_secret && typeof invoice.payment_intent === 'string' && invoice.payment_intent) {
        const intent = await stripe.paymentIntents.retrieve(invoice.payment_intent)
        client_secret = intent.client_secret
      }
    } else if (rawInvoice && typeof rawInvoice === 'object') {
      const inv = rawInvoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string; confirmation_secret?: { client_secret: string } }
      client_secret = getClientSecretFromInvoice(inv)
      if (!client_secret && typeof inv.payment_intent === 'string' && inv.payment_intent) {
        const intent = await stripe.paymentIntents.retrieve(inv.payment_intent)
        client_secret = intent.client_secret
      }
      if (!client_secret && inv.id) {
        try {
          const refetched = await stripe.invoices.retrieve(inv.id, {
            expand: ['payment_intent', 'confirmation_secret'],
          }) as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string; confirmation_secret?: { client_secret: string } }
          client_secret = getClientSecretFromInvoice(refetched)
          if (!client_secret && typeof refetched.payment_intent === 'string' && refetched.payment_intent) {
            const intent = await stripe.paymentIntents.retrieve(refetched.payment_intent)
            client_secret = intent.client_secret
          }
        } catch (e) {
          console.error('[billing] Refetch invoice with expand failed:', e)
        }
      }
    }

    if (!client_secret) {
      // $0 first invoice (e.g. free trial): no PaymentIntent, subscription may already be active/trialing
      const subStatus = subscription.status
      let invoiceAmountDue = 0
      let invStatus: string | undefined = undefined
      if (invoiceId) {
        try {
          const inv = await stripe.invoices.retrieve(invoiceId)
          invoiceAmountDue = inv.amount_due ?? 0
          invStatus = inv.status ?? undefined
          console.error('[billing] Fallback invoice fetch:', { invoice_id: invoiceId, status: inv.status, amount_due: inv.amount_due, collection_method: inv.collection_method })
        } catch (e) {
          console.error('[billing] Fallback invoice fetch failed:', e)
        }
      }
      if (subStatus === 'trialing' || subStatus === 'active' || invoiceAmountDue === 0) {
        const priceId = subscription.items?.data?.[0]?.price?.id
        const tier = priceId ? getTierByPriceId(priceId) : null
        if (tier) {
          await supabaseAdmin
            .from('users')
            .update({ stripe_subscription_id: subscription.id, subscription_tier: tier })
            .eq('id', userId)
        }
        return res.json({ subscription_id: subscription.id, skip_payment: true })
      }
      console.error('[billing] No payment intent client_secret. Subscription:', subscription.id, 'status:', subStatus, 'invoice:', invoiceId, 'invoice_status:', invStatus, 'amount_due:', invoiceAmountDue)
      return res.status(500).json({
        error: 'Could not create payment intent. In Stripe, this price must charge immediately: remove any free trial, use Recurring with amount > 0, and use the Price ID (not Product ID) in your env.',
      })
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

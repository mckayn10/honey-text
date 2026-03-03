import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../lib/supabase.js'
import { getTierByPriceId } from '../lib/subscriptionConfig.js'

const router = express.Router()
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

router.post('/', async (req: express.Request, res: express.Response) => {
    if (!stripe || !webhookSecret) {
      console.error('[stripe webhook] Stripe or webhook secret not configured')
      return res.status(503).send('Webhook not configured')
    }

    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      return res.status(400).send('Missing stripe-signature')
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err: any) {
      console.error('[stripe webhook] Signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription
          const priceId = sub.items?.data?.[0]?.price?.id
          const tier = priceId ? getTierByPriceId(priceId) : null
          const userId = sub.metadata?.supabase_user_id
          if (tier) {
            if (userId) {
              await supabaseAdmin
                .from('users')
                .update({
                  stripe_subscription_id: sub.id,
                  subscription_tier: tier,
                })
                .eq('id', userId)
            } else {
              await supabaseAdmin
                .from('users')
                .update({ subscription_tier: tier })
                .eq('stripe_subscription_id', sub.id)
            }
          }
          break
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          await supabaseAdmin
            .from('users')
            .update({
              stripe_subscription_id: null,
              subscription_tier: null,
            })
            .eq('stripe_subscription_id', sub.id)
          break
        }
        case 'invoice.paid':
          break
        default:
          break
      }
    } catch (err) {
      console.error('[stripe webhook] Handler error:', err)
    }

    res.json({ received: true })
  }
)

export default router

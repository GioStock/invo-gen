import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response('Missing signature or webhook secret', { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Received event:', event.type)

    // Handle different webhook events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription, 'active')
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription, 'canceled')
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleSubscriptionChange(
  supabase: any,
  subscription: Stripe.Subscription,
  status: string
) {
  try {
    const customerId = subscription.customer as string
    
    // Get user ID from Stripe customer ID
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!existingSub) {
      console.error('No user found for customer:', customerId)
      return
    }

    // Determine plan based on subscription items
    let plan = 'FREE'
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id
      // Check actual price ID for Pro plan
      if (priceId === 'price_1S9Q3NRqkShKldCBBZYqnWqX') {
        plan = 'PRO'
      }
    }

    // Update subscription in database
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan,
        status,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error updating subscription:', error)
    } else {
      console.log(`Updated subscription for customer ${customerId} to ${plan} (${status})`)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionChange:', error)
  }
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    
    // Get user ID from Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!subscription) {
      console.error('No user found for customer:', customerId)
      return
    }

    // Record payment in payment_history
    const { error } = await supabase
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        stripe_payment_intent_id: invoice.payment_intent,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        description: `Payment for invoice ${invoice.number}`,
      })

    if (error) {
      console.error('Error recording payment:', error)
    } else {
      console.log(`Recorded payment for customer ${customerId}`)
    }
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error)
  }
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    
    // Get user ID and update subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!subscription) {
      console.error('No user found for customer:', customerId)
      return
    }

    // Update subscription status to past_due
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    // Record failed payment
    await supabase
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        stripe_payment_intent_id: invoice.payment_intent,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        description: `Failed payment for invoice ${invoice.number}`,
      })

    console.log(`Handled payment failure for customer ${customerId}`)
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
  }
}

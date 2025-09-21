// Stripe configuration and utilities
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export { stripePromise };

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    features: [
      '5 fatture al mese',
      'Gestione clienti',
      'PDF download',
      'Supporto base'
    ],
    limits: {
      invoices: 5,
      customers: 50
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_1S9Q3NRqkShKldCBBZYqnWqX', // Price ID corretto €4.99/mese
    features: [
      'Fatture illimitate',
      'Clienti illimitati',
      'Email fatture',
      'Template personalizzati',
      'Supporto prioritario',
      'Export Excel/CSV'
    ],
    limits: {
      invoices: -1, // -1 = unlimited
      customers: -1
    }
  }
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// User subscription interface
export interface UserSubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

// Usage tracking interface
export interface UsageStats {
  user_id: string;
  invoices_count: number;
  customers_count: number;
  current_period_start: string;
  current_period_end: string;
}

// Check if user can perform action based on plan limits
export const canPerformAction = (
  subscription: UserSubscription,
  currentUsage: UsageStats,
  action: 'create_invoice' | 'create_customer'
): boolean => {
  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  
  switch (action) {
    case 'create_invoice':
      if (plan.limits.invoices === -1) return true;
      return currentUsage.invoices_count < plan.limits.invoices;
    
    case 'create_customer':
      if (plan.limits.customers === -1) return true;
      return currentUsage.customers_count < plan.limits.customers;
    
    default:
      return false;
  }
};

// Format price for display
export const formatPrice = (price: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

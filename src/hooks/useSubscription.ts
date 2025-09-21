import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserSubscription, UsageStats, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../lib/stripe';

export function useSubscription() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        console.log('useSubscription: user not authenticated');
        return;
      }
      
      console.log('useSubscription: fetching subscription for user', auth.user.id);

      // Fetch user subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', auth.user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
        return;
      }

      console.log('useSubscription: fetched subscription data:', subData);

      // If no subscription exists, create a default FREE subscription
      if (!subData) {
        console.log('useSubscription: no subscription found, creating default FREE subscription');
        const newSubscription: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'> = {
          user_id: auth.user.id,
          plan: 'FREE',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        };

        const { data: createdSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert([newSubscription])
          .select()
          .single();

        if (createError) {
          console.error('Error creating subscription:', createError);
          return;
        }

        setSubscription(createdSub);
      } else {
        setSubscription(subData);
      }

      // Fetch usage stats
      await fetchUsageStats();
    } catch (error) {
      console.error('Error in fetchSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      // Get current period dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Count invoices in current period
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      // Count total customers
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const usageStats: UsageStats = {
        user_id: auth.user.id,
        invoices_count: invoicesCount || 0,
        customers_count: customersCount || 0,
        current_period_start: startOfMonth.toISOString(),
        current_period_end: endOfMonth.toISOString(),
      };

      setUsage(usageStats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const canCreateInvoice = (): boolean => {
    if (!subscription || !usage) return false;
    
    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    if (plan.limits.invoices === -1) return true;
    
    return usage.invoices_count < plan.limits.invoices;
  };

  const canCreateCustomer = (): boolean => {
    if (!subscription || !usage) return false;
    
    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    if (plan.limits.customers === -1) return true;
    
    return usage.customers_count < plan.limits.customers;
  };

  const getRemainingInvoices = (): number => {
    if (!subscription || !usage) return 0;
    
    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    if (plan.limits.invoices === -1) return -1; // unlimited
    
    return Math.max(0, plan.limits.invoices - usage.invoices_count);
  };

  const getRemainingCustomers = (): number => {
    if (!subscription || !usage) return 0;
    
    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    if (plan.limits.customers === -1) return -1; // unlimited
    
    return Math.max(0, plan.limits.customers - usage.customers_count);
  };

  const upgradeToProPlan = async (): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Call Supabase Edge Function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId: auth.user.id,
          email: auth.user.email,
          priceId: SUBSCRIPTION_PLANS.PRO.stripePriceId,
        },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, checkoutUrl: data.url };
    } catch (error) {
      console.error('Error in upgradeToProPlan:', error);
      return { success: false, error: 'Failed to create checkout session' };
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return {
    subscription,
    usage,
    loading,
    canCreateInvoice,
    canCreateCustomer,
    getRemainingInvoices,
    getRemainingCustomers,
    upgradeToProPlan,
    refetch: fetchSubscription,
  };
}


-- Migration per sistema subscriptions e pagamenti Stripe
-- Esegui questo in Supabase SQL Editor

-- 1. Tabella user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('FREE', 'PRO')),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Tabella usage_tracking per monitorare limiti
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  invoices_count integer DEFAULT 0,
  customers_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- 3. Tabella payment_history per tracking pagamenti
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text,
  amount integer NOT NULL, -- in centesimi
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- 4. Abilita RLS su tutte le tabelle
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 5. Policy RLS per user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Policy RLS per usage_tracking
CREATE POLICY "Users can view their own usage" ON usage_tracking
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON usage_tracking
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON usage_tracking
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Policy RLS per payment_history
CREATE POLICY "Users can view their own payments" ON payment_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payment_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. Trigger per updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON usage_tracking 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Funzione per ottenere usage stats corrente
CREATE OR REPLACE FUNCTION get_current_usage(target_user_id uuid)
RETURNS TABLE (
  invoices_count bigint,
  customers_count bigint,
  period_start timestamptz,
  period_end timestamptz
) AS $$
DECLARE
  start_date timestamptz := date_trunc('month', now());
  end_date timestamptz := (date_trunc('month', now()) + interval '1 month' - interval '1 day');
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT count(*) 
      FROM invoices i
      JOIN profiles p ON i.company_id = p.company_id
      WHERE p.id = target_user_id 
        AND i.created_at >= start_date 
        AND i.created_at <= end_date
    ), 0)::bigint as invoices_count,
    COALESCE((
      SELECT count(*) 
      FROM customers c
      JOIN profiles p ON c.company_id = p.company_id
      WHERE p.id = target_user_id
    ), 0)::bigint as customers_count,
    start_date as period_start,
    end_date as period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Funzione per verificare limiti piano
CREATE OR REPLACE FUNCTION check_plan_limits(
  target_user_id uuid,
  action_type text -- 'invoice' or 'customer'
)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  current_usage record;
  can_proceed boolean := false;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan
  FROM user_subscriptions
  WHERE user_id = target_user_id
    AND status = 'active';
  
  -- Default to FREE if no subscription found
  IF user_plan IS NULL THEN
    user_plan := 'FREE';
  END IF;
  
  -- Get current usage
  SELECT * INTO current_usage
  FROM get_current_usage(target_user_id);
  
  -- Check limits based on plan and action
  IF user_plan = 'PRO' THEN
    can_proceed := true; -- PRO has unlimited everything
  ELSIF user_plan = 'FREE' THEN
    IF action_type = 'invoice' THEN
      can_proceed := current_usage.invoices_count < 5;
    ELSIF action_type = 'customer' THEN
      can_proceed := current_usage.customers_count < 50;
    END IF;
  END IF;
  
  RETURN can_proceed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Insert default subscriptions for existing users
INSERT INTO user_subscriptions (user_id, plan, status)
SELECT 
  id as user_id,
  'FREE' as plan,
  'active' as status
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- 12. Verifica finale
SELECT 'Schema subscriptions creato con successo!' as result;


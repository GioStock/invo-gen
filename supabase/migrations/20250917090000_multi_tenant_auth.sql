-- Multi-tenant schema per autenticazione e isolamento dati

-- Tabella companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella profiles (collegata a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Aggiungi company_id alle tabelle esistenti
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Abilita RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy per companies
CREATE POLICY "Users can create company" ON companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their company" ON companies FOR SELECT TO authenticated USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their company" ON companies FOR UPDATE TO authenticated USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policy per profiles
CREATE POLICY "Users can create profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Aggiorna policy esistenti per includere company_id
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage their own invoice items" ON invoice_items;

CREATE POLICY "Users can manage their own customers" ON customers FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own invoices" ON invoices FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own invoice items" ON invoice_items FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Funzione per ottenere company_id corrente
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger per impostare automaticamente company_id
CREATE OR REPLACE FUNCTION set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id = current_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Applica trigger alle tabelle
CREATE TRIGGER set_customers_company_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_invoices_company_id
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_invoice_items_company_id
  BEFORE INSERT ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION set_company_id();

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

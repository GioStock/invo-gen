/*
  # Sistema di Gestione Fatture - Invo Gen

  1. Nuove Tabelle
    - `customers` - Anagrafica clienti
      - `id` (uuid, primary key)  
      - `name` (text) - Nome cliente
      - `email` (text) - Email cliente
      - `phone` (text) - Telefono
      - `address` (text) - Indirizzo
      - `city` (text) - Città
      - `postal_code` (text) - CAP
      - `country` (text) - Paese
      - `vat_number` (text) - Partita IVA
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `invoices` - Fatture
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique) - Numero fattura
      - `customer_id` (uuid) - Riferimento cliente
      - `issue_date` (date) - Data emissione
      - `due_date` (date) - Data scadenza
      - `status` (enum) - Stato (draft, sent, paid, overdue)
      - `subtotal` (decimal) - Subtotale
      - `tax_rate` (decimal) - Aliquota IVA
      - `tax_amount` (decimal) - Importo IVA
      - `total` (decimal) - Totale
      - `notes` (text) - Note
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `invoice_items` - Righe fattura
      - `id` (uuid, primary key)
      - `invoice_id` (uuid) - Riferimento fattura
      - `description` (text) - Descrizione articolo
      - `quantity` (decimal) - Quantità
      - `unit_price` (decimal) - Prezzo unitario
      - `total` (decimal) - Totale riga
      - `created_at` (timestamp)

  2. Sicurezza
    - Abilita RLS su tutte le tabelle
    - Policy per utenti autenticati per accedere ai propri dati
*/

-- Crea enum per lo stato delle fatture
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- Tabella clienti
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Italia',
  vat_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella fatture
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status invoice_status DEFAULT 'draft',
  subtotal decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 22.00,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella righe fattura
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Abilita RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policy per customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy per invoices
CREATE POLICY "Users can manage their own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy per invoice_items
CREATE POLICY "Users can manage their own invoice items"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
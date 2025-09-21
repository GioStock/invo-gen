-- Fix invoice number constraint per multi-tenancy
-- Remove global unique constraint and add company-specific constraint

-- 1. Rimuovi il constraint globale di unicità su invoice_number
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- 2. Aggiungi un constraint di unicità composto per (company_id, invoice_number)
-- Questo permette lo stesso numero fattura per company diverse
ALTER TABLE invoices 
ADD CONSTRAINT invoices_company_invoice_number_unique 
UNIQUE (company_id, invoice_number);

-- 3. Verifica che la colonna company_id esista e sia NOT NULL
-- (dovrebbe già esistere dalle migrazioni precedenti)
ALTER TABLE invoices 
ALTER COLUMN company_id SET NOT NULL;

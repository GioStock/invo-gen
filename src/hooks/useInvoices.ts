import { useState, useEffect } from 'react';
import { supabase, Invoice, InvoiceItem } from '../lib/supabase';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Verifica che l'utente sia autenticato
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        console.log('Utente non autenticato');
        setInvoices([]);
        setLoading(false);
        return;
      }

      // Le policy RLS dovrebbero filtrare automaticamente per company_id
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore query invoices:', error);
        throw error;
      }
      
      console.log(`Caricate ${data?.length || 0} fatture per l'utente ${auth.user.email}`);
      setInvoices(data || []);
    } catch (error) {
      console.error('Errore nel caricamento fatture:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getInvoice = async (id: string): Promise<Invoice | null> => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Errore nel caricamento fattura:', error);
      return null;
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    
    // Verifica autenticazione
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error('Utente non autenticato');
    }
    
    // Ottieni company_id dell'utente corrente
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', auth.user.id)
      .single();
    
    if (!profile?.company_id) {
      throw new Error('Profilo aziendale non trovato');
    }
    
    // Ottieni tutti i numeri di fattura esistenti per questa company e anno
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', profile.company_id)
      .like('invoice_number', `${year}%`)
      .order('invoice_number');
    
    // Trova il prossimo numero disponibile
    let nextNumber = 1;
    const existingNumbers = (existingInvoices || []).map(inv => {
      const match = inv.invoice_number.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    }).sort((a, b) => a - b);
    
    // Trova il primo numero disponibile
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else if (num > nextNumber) {
        break;
      }
    }
    
    return `${year}-${nextNumber.toString().padStart(4, '0')}`;
  };

  const createInvoice = async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Invoice = {
      ...invoice,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Invoice;
    setInvoices(prev => [optimistic, ...prev]);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;
      setInvoices(prev => [data as Invoice, ...prev.filter(i => i.id !== tempId)]);
      return data as Invoice;
    } catch (error) {
      setInvoices(prev => prev.filter(i => i.id !== tempId));
      console.error('Errore nella creazione fattura:', error);
      throw error;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const prev = invoices;
    setInvoices(prev.map(i => (i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } as Invoice : i)));
    try {
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      setInvoices(prev);
      console.error('Errore nell\'aggiornamento fattura:', error);
      throw error;
    }
  };

  const deleteInvoice = async (id: string) => {
    const prev = invoices;
    setInvoices(prev.filter(i => i.id !== id));
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      setInvoices(prev);
      console.error('Errore nell\'eliminazione fattura:', error);
      throw error;
    }
  };

  const createInvoiceItems = async (items: Omit<InvoiceItem, 'id' | 'created_at'>[]) => {
    try {
      const { error } = await supabase
        .from('invoice_items')
        .insert(items);

      if (error) throw error;
    } catch (error) {
      console.error('Errore nella creazione righe fattura:', error);
      throw error;
    }
  };

  const updateInvoiceItems = async (invoiceId: string, items: Omit<InvoiceItem, 'id' | 'created_at'>[]) => {
    try {
      // Elimina le righe esistenti
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      // Inserisce le nuove righe
      if (items.length > 0) {
        await createInvoiceItems(items);
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento righe fattura:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    fetchInvoices,
    getInvoice,
    generateInvoiceNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createInvoiceItems,
    updateInvoiceItems,
  };
}
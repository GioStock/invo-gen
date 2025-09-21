import { useState, useEffect } from 'react';
import { supabase, Customer } from '../lib/supabase';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Verifica che l'utente sia autenticato
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        console.log('Utente non autenticato');
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Le policy RLS dovrebbero filtrare automaticamente per company_id
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore query customers:', error);
        throw error;
      }
      
      console.log(`Caricati ${data?.length || 0} clienti per l'utente ${auth.user.email}`);
      setCustomers(data || []);
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: Customer = {
      id: tempId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postal_code: customer.postal_code,
      country: customer.country,
      vat_number: customer.vat_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCustomers(prev => [optimistic, ...prev]);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      // replace temp with real
      setCustomers(prev => [data as Customer, ...prev.filter(c => c.id !== tempId)]);
      return data as Customer;
    } catch (error) {
      // rollback
      setCustomers(prev => prev.filter(c => c.id !== tempId));
      console.error('Errore nella creazione cliente:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    // Optimistic update
    const prev = customers;
    setCustomers(prev.map(c => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } as Customer : c)));
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // rollback
      setCustomers(prev);
      console.error('Errore nell\'aggiornamento cliente:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    // Optimistic delete
    const prev = customers;
    setCustomers(prev.filter(c => c.id !== id));
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // rollback
      setCustomers(prev);
      console.error('Errore nell\'eliminazione cliente:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
import React from 'react';
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react';
import { Customer } from '../lib/supabase';
import { useCustomers } from '../hooks/useCustomers';
import { ListSkeleton } from './SkeletonLoader';
import { useConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface CustomerListProps {
  onCreateCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export function CustomerList({ onCreateCustomer, onEditCustomer }: CustomerListProps) {
  const { customers, loading, deleteCustomer } = useCustomers();
  const { addToast } = useToast();
  const { confirm, ConfirmModal } = useConfirmModal();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (customer: Customer) => {
    confirm({
      title: 'Elimina Cliente',
      message: `Sei sicuro di voler eliminare il cliente ${customer.name}? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteCustomer(customer.id);
          addToast({
            type: 'success',
            title: 'Cliente eliminato',
            message: `Il cliente ${customer.name} è stato eliminato con successo.`
          });
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Errore',
            message: 'Si è verificato un errore durante l\'eliminazione del cliente.'
          });
        }
      }
    });
  };

  if (loading) {
    return <ListSkeleton items={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clienti</h1>
          <p className="mt-2 opacity-80">Gestisci la tua anagrafica clienti</p>
        </div>
        <button
          onClick={onCreateCustomer}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50 w-4 h-4" />
          <input
            type="text"
            placeholder="Cerca per nome, email o città..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Customer list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 opacity-50 mx-auto mb-4" />
            <p className="opacity-70">
              {searchTerm
                ? 'Nessun cliente trovato con i filtri applicati' 
                : 'Nessun cliente presente'
              }
            </p>
          </div>
        ) : (
            <table className="min-w-full" style={{ borderColor: 'var(--card-border)' }}>
              <thead style={{ background: '#8aa29e' }}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Nome
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Contatti
                  </th>
                  <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Indirizzo
                  </th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    P.IVA
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody style={{ background: 'var(--card-bg)', color: 'var(--text-color)' }}>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="transition-colors" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="font-medium text-sm sm:text-base">{customer.name}</p>
                        <div className="md:hidden text-xs text-gray-500 mt-1">
                          {customer.address && <p>{customer.address}</p>}
                          {customer.vat_number && <p>P.IVA: {customer.vat_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm">
                        {customer.email && <p className="truncate max-w-32 sm:max-w-none">{customer.email}</p>}
                        {customer.phone && <p>{customer.phone}</p>}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                      <div className="text-sm">
                        {customer.address && <p>{customer.address}</p>}
                        {(customer.postal_code || customer.city) && (
                          <p>
                            {customer.postal_code && `${customer.postal_code} `}
                            {customer.city}
                          </p>
                        )}
                        {customer.country && <p>{customer.country}</p>}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm">
                      {customer.vat_number || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                        <button
                          onClick={() => onEditCustomer(customer)}
                          className="btn-ghost p-1.5 sm:p-2"
                          title="Modifica"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="btn-ghost p-1.5 sm:p-2"
                          title="Elimina"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
        </div>
      </div>
      
      <ConfirmModal />
    </div>
  );
}
import React from 'react';
import { Plus, Eye, Edit, Trash2, Search, FileText } from 'lucide-react';
import { Invoice } from '../lib/supabase';
import { useInvoices } from '../hooks/useInvoices';
import { ListSkeleton } from './SkeletonLoader';
import { useConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface InvoiceListProps {
  onCreateInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export function InvoiceList({ onCreateInvoice, onEditInvoice, onViewInvoice }: InvoiceListProps) {
  const { invoices, loading, deleteInvoice } = useInvoices();
  const { addToast } = useToast();
  const { confirm, ConfirmModal } = useConfirmModal();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<Invoice['status'] | 'all'>('all');

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Bozza';
      case 'sent': return 'Inviata';
      case 'paid': return 'Pagata';
      case 'overdue': return 'Scaduta';
      default: return status;
    }
  };

  const handleDelete = (invoice: Invoice) => {
    confirm({
      title: 'Elimina Fattura',
      message: `Sei sicuro di voler eliminare la fattura ${invoice.invoice_number}? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteInvoice(invoice.id);
          addToast({
            type: 'success',
            title: 'Fattura eliminata',
            message: `La fattura ${invoice.invoice_number} è stata eliminata con successo.`
          });
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Errore',
            message: 'Si è verificato un errore durante l\'eliminazione della fattura.'
          });
        }
      }
    });
  };

  if (loading) {
    return <ListSkeleton items={8} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fatture</h1>
          <p className="mt-2 opacity-80">Gestisci tutte le tue fatture</p>
        </div>
        <button
          onClick={onCreateInvoice}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuova Fattura
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50 w-4 h-4" />
            <input
              type="text"
              placeholder="Cerca per numero fattura o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | 'all')}
            className="select"
          >
            <option value="all">Tutti gli stati</option>
            <option value="draft">Bozza</option>
            <option value="sent">Inviata</option>
            <option value="paid">Pagata</option>
            <option value="overdue">Scaduta</option>
          </select>
        </div>
      </div>

      {/* Invoice list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 opacity-50 mx-auto mb-4" />
            <p className="opacity-70">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nessuna fattura trovata con i filtri applicati' 
                : 'Nessuna fattura presente'
              }
            </p>
          </div>
        ) : (
            <table className="min-w-full" style={{ borderColor: 'var(--card-border)' }}>
              <thead style={{ background: '#8aa29e' }}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Fattura
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Cliente
                  </th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Data
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Stato
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Totale
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#fafafa' }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody style={{ background: 'var(--card-bg)', color: 'var(--text-color)' }}>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="font-medium text-sm sm:text-base">{invoice.invoice_number}</p>
                        <p className="sm:hidden text-xs text-gray-500 mt-1">
                          {new Date(invoice.issue_date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-sm sm:text-base truncate max-w-32 sm:max-w-none">{invoice.customer?.name || 'Cliente sconosciuto'}</p>
                    </td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm opacity-80">
                      {new Date(invoice.issue_date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`badge ${
                        invoice.status === 'draft' ? 'badge-gray' :
                        invoice.status === 'sent' ? 'badge-yellow' :
                        invoice.status === 'paid' ? 'badge-green' :
                        'badge-red'
                      }`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-semibold text-sm sm:text-base">
                      €{invoice.total.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                        <button
                          onClick={() => onViewInvoice(invoice)}
                          className="btn-ghost p-1.5 sm:p-2"
                          title="Visualizza"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => onEditInvoice(invoice)}
                          className="btn-ghost p-1.5 sm:p-2"
                          title="Modifica"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice)}
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
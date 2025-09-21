import React from 'react';
import { X } from 'lucide-react';
import { Customer } from '../lib/supabase';
import { useCustomers } from '../hooks/useCustomers';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSave: () => void;
}

export function CustomerForm({ customer, onClose, onSave }: CustomerFormProps) {
  const { createCustomer, updateCustomer } = useCustomers();
  const [loading, setLoading] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || 'Italia',
    vat_number: customer?.vat_number || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (customer) {
        await updateCustomer(customer.id, formData);
      } else {
        await createCustomer(formData);
      }
      onSave();
    } catch (error) {
      console.error('Errore nel salvataggio cliente:', error);
      alert('Errore nel salvataggio del cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', border: '1px solid' }}>
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ borderBottomColor: 'var(--card-border)', borderBottom: '1px solid' }}>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-color)' }}>
            {customer ? 'Modifica Cliente' : 'Nuovo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-color)', opacity: 0.6 }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Indirizzo
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Città
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                CAP
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Paese
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Partita IVA
              </label>
              <input
                type="text"
                value={formData.vat_number}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6" style={{ borderTopColor: 'var(--card-border)', borderTop: '1px solid' }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition-colors text-base"
              style={{ 
                borderColor: 'var(--card-border)', 
                border: '1px solid',
                color: 'var(--text-color)',
                backgroundColor: 'var(--card-bg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-border)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 text-base"
              style={{ 
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                focusRingColor: 'var(--btn-bg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg)'}
            >
              {loading ? 'Salvataggio...' : 'Salva Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
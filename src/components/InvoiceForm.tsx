import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Invoice, InvoiceItem, Customer, supabase } from '../lib/supabase';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';

interface InvoiceFormProps {
  invoice?: Invoice;
  onClose: () => void;
  onSave: () => void;
}

export function InvoiceForm({ invoice, onClose, onSave }: InvoiceFormProps) {
  const { customers } = useCustomers();
  const { generateInvoiceNumber, createInvoice, updateInvoice, createInvoiceItems, updateInvoiceItems } = useInvoices();
  
  const [formData, setFormData] = React.useState({
    invoice_number: invoice?.invoice_number || '',
    customer_id: invoice?.customer_id || '',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: invoice?.status || 'draft' as Invoice['status'],
    tax_rate: invoice?.tax_rate || 22,
    notes: invoice?.notes || '',
  });

  const [items, setItems] = React.useState<Omit<InvoiceItem, 'id' | 'created_at'>[]>(
    invoice?.invoice_items?.map(item => ({
      invoice_id: item.invoice_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    })) || [{
      invoice_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    }]
  );

  const [loading, setLoading] = React.useState(false);

  // Company Logo handling (saved locally for now)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const savedPublic = localStorage.getItem('companyLogoUrl');
    const savedLocal = localStorage.getItem('companyLogo');
    if (savedPublic) setLogoUrl(savedPublic);
    else if (savedLocal) setLogoUrl(savedLocal);
  }, []);

  const pickLogo = () => logoInputRef.current?.click();
  const onLogoChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setLogoUrl(dataUrl);
      localStorage.setItem('companyLogo', dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage (bucket: branding, path: logo.<ext>)
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo.${ext}`;
      await supabase.storage.from('branding').upload(path, file, { upsert: true, cacheControl: '3600' });
      const { data } = supabase.storage.from('branding').getPublicUrl(path);
      if (data?.publicUrl) {
        localStorage.setItem('companyLogoUrl', data.publicUrl);
      }
    } catch (err) {
      console.error('Upload logo su Supabase fallito:', err);
    }
  };

  React.useEffect(() => {
    if (!invoice) {
      generateInvoiceNumber().then(number => {
        setFormData(prev => ({ ...prev, invoice_number: number }));
      });
    }
  }, [invoice]);

  const calculations = React.useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = (subtotal * formData.tax_rate) / 100;
    const total = subtotal + tax_amount;
    return { subtotal, tax_amount, total };
  }, [items, formData.tax_rate]);

  const addItem = () => {
    setItems([...items, {
      invoice_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };
    
    if (field === 'quantity' || field === 'unit_price') {
      item[field] = Number(value);
      item.total = item.quantity * item.unit_price;
    } else {
      item[field] = value as string;
    }
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invoiceData = {
        ...formData,
        subtotal: calculations.subtotal,
        tax_amount: calculations.tax_amount,
        total: calculations.total,
      };

      let invoiceId: string;

      if (invoice) {
        await updateInvoice(invoice.id, invoiceData);
        invoiceId = invoice.id;
      } else {
        const newInvoice = await createInvoice(invoiceData);
        invoiceId = newInvoice.id;
      }

      // Update items with invoice_id
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invoiceId,
      }));

      if (invoice) {
        await updateInvoiceItems(invoiceId, itemsWithInvoiceId);
      } else {
        await createInvoiceItems(itemsWithInvoiceId);
      }

      onSave();
    } catch (error) {
      console.error('Errore nel salvataggio fattura:', error);
      alert('Errore nel salvataggio della fattura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="rounded-xl shadow-xl w-full max-w-4xl my-8" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', border: '1px solid' }}>
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ borderBottomColor: 'var(--card-border)', borderBottom: '1px solid' }}>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-color)' }}>
            {invoice ? 'Modifica Fattura' : 'Nuova Fattura'}
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
          {/* Header info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Numero Fattura
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
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
                Cliente
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
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
              >
                <option value="">Seleziona cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              >
                <option value="draft">Bozza</option>
                <option value="sent">Inviata</option>
                <option value="paid">Pagata</option>
                <option value="overdue">Scaduta</option>
              </select>
            </div>
          </div>

          {/* Logo upload / preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain rounded" />
          ) : (
            <div className="h-12 w-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
              Logo
            </div>
          )}
              <p className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>Questo logo apparirà nella stampa/PDF.</p>
            </div>
            <div className="flex items-center gap-3">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              <button type="button" onClick={pickLogo} className="btn">
                {logoUrl ? 'Cambia Logo' : 'Imposta Logo'}
              </button>
              {logoUrl && (
                <button type="button" onClick={() => { localStorage.removeItem('companyLogo'); localStorage.removeItem('companyLogoUrl'); setLogoUrl(null); }} className="btn-ghost text-red-600">
                  Rimuovi
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Data Emissione
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
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
                Data Scadenza
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                Aliquota IVA (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
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
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>Articoli</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg)'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Articolo
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 p-4 rounded-lg" style={{ borderColor: 'var(--card-border)', border: '1px solid' }}>
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      placeholder="Descrizione"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
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
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Qtà"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
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
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Prezzo"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
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
                  <div className="col-span-3 md:col-span-2">
                    <div className="px-3 py-2 rounded-lg font-medium" style={{ color: 'var(--text-color)', backgroundColor: 'var(--card-border)', opacity: 0.1 }}>
                      €{item.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#db5461' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="pt-6" style={{ borderTopColor: 'var(--card-border)', borderTop: '1px solid' }}>
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-color)', opacity: 0.7 }}>Subtotale:</span>
                <span className="font-medium" style={{ color: 'var(--text-color)' }}>€{calculations.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-color)', opacity: 0.7 }}>IVA ({formData.tax_rate}%):</span>
                <span className="font-medium" style={{ color: 'var(--text-color)' }}>€{calculations.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTopColor: 'var(--card-border)', borderTop: '1px solid' }}>
                <span style={{ color: 'var(--text-color)' }}>Totale:</span>
                <span style={{ color: 'var(--text-color)' }}>€{calculations.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Note
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors"
              style={{ 
                borderColor: 'var(--card-border)', 
                border: '1px solid',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--btn-bg)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Actions */}
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
              {loading ? 'Salvataggio...' : 'Salva Fattura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
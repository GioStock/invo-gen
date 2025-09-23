import React from 'react';
import { X, Download, Edit, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Invoice, supabase } from '../lib/supabase';
import { EmailModal } from './EmailModal';
import { useInvoices } from '../hooks/useInvoices';
import { useToast } from './Toast';

interface InvoiceViewProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
}

export function InvoiceView({ invoice, onClose, onEdit }: InvoiceViewProps) {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [companyData, setCompanyData] = React.useState<any>(null);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { refreshInvoices } = useInvoices();
  const { addToast } = useToast();

  React.useEffect(() => {
    // Carica i dati aziendali e il logo specifico della company
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', uid).single();
      if (profile?.company_id) {
        const companyId = profile.company_id;
        
        // Carica dati aziendali
        const { data: company } = await supabase.from('companies').select('*').eq('id', companyId).single();
        if (company) setCompanyData(company);

        // Carica logo specifico della company
        const savedLogoUrl = localStorage.getItem(`companyLogoUrl-${companyId}`);
        if (savedLogoUrl) {
          setLogoUrl(savedLogoUrl);
        } else {
          // Prova a caricare il logo dal storage Supabase
          const logoPath = `logo-${companyId}.png`;
          const { data } = supabase.storage.from('branding').getPublicUrl(logoPath);
          if (data?.publicUrl) {
            setLogoUrl(data.publicUrl);
            localStorage.setItem(`companyLogoUrl-${companyId}`, data.publicUrl);
          }
        }
      }
    })();
  }, []);

  const handlePickLogo = () => fileInputRef.current?.click();

  const handleLogoChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Ottieni company_id dell'utente corrente
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', auth.user.id)
        .single();

      if (!profile?.company_id) return;

      const companyId = profile.company_id;
      
      // Preview immediato
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        setLogoUrl(dataUrl);
      };
      reader.readAsDataURL(file);

      // Upload con nome specifico per company
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo-${companyId}.${ext}`;
      
      const { error } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      
      if (!error) {
        const { data } = supabase.storage.from('branding').getPublicUrl(path);
        if (data?.publicUrl) {
          localStorage.setItem(`companyLogoUrl-${companyId}`, data.publicUrl);
          setLogoUrl(data.publicUrl);
        }
      }
    } catch (error) {
      console.error('Errore upload logo:', error);
    }
  };
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;
    
    // Assicurati che tutte le immagini siano caricate prima di generare il PDF
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(img);
        } else {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img); // Continua anche se l'immagine fallisce
        }
      });
    });
    
    // Aspetta che tutte le immagini siano caricate
    await Promise.all(imagePromises);
    
    // Aggiungi un piccolo delay per assicurarsi che il rendering sia completo
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await html2canvas(element, { 
      scale: 2, 
      backgroundColor: '#ffffff',
      useCORS: true, // Importante per le immagini cross-origin
      allowTaint: false,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let position = 0;
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // handle multipage
      let remainingHeight = imgHeight;
      const canvasHeight = canvas.height;
      const canvasPageHeight = (canvasHeight * pageWidth) / canvas.width;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          position = 0;
        }
      }
    }
    pdf.save(`${invoice.invoice_number}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 print:shadow-none print:rounded-none print:border-0">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">
            Fattura {invoice.invoice_number}
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <button
              onClick={handlePickLogo}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Imposta Logo
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: 'var(--btn-bg)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-bg)'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Invia Email
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Stampa
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div id="invoice-print-area" className="p-8 print:p-0 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {logoUrl ? (
                <div className="mb-4">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="max-h-16 object-contain" 
                    crossOrigin="anonymous"
                    style={{ maxWidth: '200px', height: 'auto' }}
                  />
                </div>
              ) : (
                <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded w-48 h-20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-600 uppercase">IL TUO</div>
                    <div className="text-lg font-bold text-blue-600 uppercase">LOGO QUI</div>
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <p>P.IVA {companyData?.vat_number || 'IT12345678901'}</p>
                <p>CF {companyData?.fiscal_code || '12345678901'}</p>
              </div>
            </div>
            <div className="text-right flex-1">
              <div className="text-lg font-semibold text-gray-900 mb-2">{companyData?.name || 'La tua ragione sociale'}</div>
              <div className="text-sm text-gray-600 mb-4">
                <p>{companyData?.address && `${companyData.address} - `}{companyData?.postal_code && `${companyData.postal_code} - `}{companyData?.city || 'Bergamo'} {companyData?.country && `(${companyData.country})`}</p>
                <p>P.iva {companyData?.vat_number || 'IT12345678912'} - C.F. {companyData?.fiscal_code || '12345678912'}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)} print:hidden`}>
                {getStatusText(invoice.status)}
              </span>
            </div>
          </div>

          {/* Invoice Number and Date */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              FATTURA nr. {invoice.invoice_number} del {new Date(invoice.issue_date).toLocaleDateString('it-IT')}
            </h1>
          </div>

          {/* Customer Details */}
          <div className="text-right mb-8">
            <div className="text-sm text-gray-500 uppercase font-semibold mb-2">DESTINATARIO</div>
            <div className="text-base font-semibold text-gray-900 mb-2">{invoice.customer?.name}</div>
            <div className="text-sm text-gray-600 space-y-1">
              {invoice.customer?.address && <p>{invoice.customer.address}</p>}
              {invoice.customer?.city && (
                <p>
                  {invoice.customer.postal_code && `${invoice.customer.postal_code} `}
                  {invoice.customer.city}
                </p>
              )}
              {invoice.customer?.country && <p>{invoice.customer.country}</p>}
              {invoice.customer?.vat_number && <p>P.IVA: {invoice.customer.vat_number}</p>}
              {invoice.customer?.email && <p>{invoice.customer.email}</p>}
              {invoice.customer?.phone && <p>{invoice.customer.phone}</p>}
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 uppercase">
                      Codice
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 uppercase">
                      Descrizione
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 uppercase">
                      Quantità
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 uppercase">
                      Prezzo Unitario
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 uppercase">
                      Importo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items?.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        P{(index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-gray-500">Descrizione prodotto {index + 1}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.quantity} pezzi
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        € {item.unit_price.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        € {item.total.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <div className="text-sm text-gray-500 uppercase font-semibold mb-2">NOTE</div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Il compenso non è soggetto a ritenute d'acconto ai sensi della Legge 190 del 23 dicembre 2014 art. 1 comma 67.</p>
              <p>Imposta di bollo da 2 euro assolta sull'originale per importi maggiori di 77,47 euro.</p>
            </div>
          </div>

          {/* Payment and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-sm text-gray-500 uppercase font-semibold mb-2">Modalità di pagamento</div>
              <div className="text-base text-gray-900">Bonifico Bancario</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 uppercase font-semibold mb-2">Scadenze</div>
              <div className="text-base text-gray-900">
                {new Date(invoice.due_date).toLocaleDateString('it-IT')}: € {invoice.total.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>

          {/* VAT Summary */}
          <div className="mb-8">
            <div className="text-sm text-gray-500 uppercase font-semibold mb-2">Riepilogo IVA</div>
            <div className="text-sm text-gray-600 mb-4">
              Operazione non soggetta ad IVA ai sensi dell'art. 1, commi da 54 a 89, della Legge 190/2014.
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-xs ml-auto">
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase font-semibold">Imponibile</div>
                <div className="text-base text-gray-900">€ {invoice.subtotal.toFixed(2).replace('.', ',')}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase font-semibold">Imposte</div>
                <div className="text-base text-gray-900">€ 0,00</div>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm">
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Imponibile</span>
                  <span className="text-sm text-gray-900">€ {invoice.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Marca da bollo</span>
                  <span className="text-sm text-gray-900">€ 2,00</span>
                </div>
                <div className="flex justify-between py-3 border-t border-gray-300 text-2xl font-bold">
                  <span className="text-gray-900">€ {invoice.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end text-sm text-gray-500 pt-6">
            <div>
              Fattura nr. {invoice.invoice_number} del {new Date(invoice.issue_date).toLocaleDateString('it-IT')} - 1 / 1
            </div>
            <div className="text-right">
              {companyData?.name || 'La tua ragione sociale'}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoice}
        onEmailSent={() => {
          console.log('Email inviata con successo');
          
          // Toast di successo
          addToast({
            type: 'success',
            title: 'Email inviata!',
            message: `Fattura ${invoice.invoice_number} inviata con successo e status aggiornato.`
          });
          
          // 🔄 REFRESH: Aggiorna lista fatture dopo invio email
          refreshInvoices();
        }}
      />
    </div>
  );
}
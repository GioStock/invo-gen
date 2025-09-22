import React from 'react';
import { X, Mail, Send, TestTube } from 'lucide-react';
import { useEmail } from '../hooks/useEmail';
import { Invoice } from '../lib/supabase';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onEmailSent?: () => void;
}

export function EmailModal({ isOpen, onClose, invoice, onEmailSent }: EmailModalProps) {
  const { sendInvoice, sendTest, loading } = useEmail();
  const [email, setEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [testEmail, setTestEmail] = React.useState('');
  const [showTest, setShowTest] = React.useState(false);

  // Reset form quando si apre/chiude il modal
  React.useEffect(() => {
    if (isOpen && invoice) {
      setEmail(invoice.customer?.email || '');
      setSubject(`Fattura ${invoice.invoice_number} - ${invoice.company?.name || 'Azienda'}`);
      setMessage(`Ciao ${invoice.customer?.name || 'Cliente'},\n\nTi inviamo in allegato la fattura ${invoice.invoice_number} per i servizi forniti.\n\nGrazie per aver scelto i nostri servizi!`);
    } else {
      setEmail('');
      setSubject('');
      setMessage('');
      setTestEmail('');
      setShowTest(false);
    }
  }, [isOpen, invoice]);

  const handleSendInvoice = async () => {
    if (!invoice || !email.trim()) return;

    try {
      // Genera PDF (simulazione - in realtà useresti html2canvas + jsPDF)
      const pdfBuffer = await generatePDFBuffer(invoice);
      
      const emailData = {
        to: email,
        customerName: invoice.customer?.name || 'Cliente',
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total: invoice.total,
        status: invoice.status,
        pdfUrl: '#', // URL temporaneo
        companyName: invoice.company?.name || 'Azienda',
        companyEmail: invoice.company?.email || 'info@azienda.com', // Email utente per Reply-To
        notes: message
      };

      const result = await sendInvoice(emailData, pdfBuffer);
      
      if (result.success) {
        onEmailSent?.();
        onClose();
      }
    } catch (error) {
      console.error('Errore invio fattura:', error);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;

    const companyName = invoice?.company?.name || 'Azienda';
    const companyEmail = invoice?.company?.email || 'info@azienda.com';
    
    await sendTest(testEmail, companyName, companyEmail);
  };

  // Generazione PDF identico a quello scaricabile
  const generatePDFBuffer = async (invoice: Invoice): Promise<ArrayBuffer> => {
    // TODO: Implementare html2canvas per PDF identico a InvoiceView
    // Per ora creiamo un PDF più dettagliato
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    
    // Header con logo e info azienda (simulato)
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FATTURA', 20, 30);
    
    pdf.setFontSize(16);
    pdf.text(`N. ${invoice.invoice_number}`, 20, 45);
    
    // Dati azienda (top-right)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const companyName = invoice.company?.name || 'La tua azienda';
    pdf.text(companyName, 140, 30);
    
    // Dati cliente
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INTESTATO A:', 20, 70);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoice.customer?.name || 'Cliente', 20, 80);
    if (invoice.customer?.address) pdf.text(invoice.customer.address, 20, 90);
    if (invoice.customer?.vat_number) pdf.text(`P.IVA: ${invoice.customer.vat_number}`, 20, 100);
    
    // Date
    pdf.text(`Data emissione: ${new Date(invoice.issue_date).toLocaleDateString('it-IT')}`, 20, 120);
    pdf.text(`Data scadenza: ${new Date(invoice.due_date).toLocaleDateString('it-IT')}`, 20, 130);
    
    // Items table (simulata)
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIZIONE', 20, 150);
    pdf.text('QTÀ', 120, 150);
    pdf.text('PREZZO', 140, 150);
    pdf.text('TOTALE', 170, 150);
    
    pdf.line(20, 155, 190, 155); // Linea orizzontale
    
    // Items (da invoice.invoice_items se disponibili)
    let yPos = 165;
    pdf.setFont('helvetica', 'normal');
    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      invoice.invoice_items.forEach((item, index) => {
        pdf.text(item.description, 20, yPos);
        pdf.text(item.quantity.toString(), 120, yPos);
        pdf.text(`€${item.unit_price.toFixed(2)}`, 140, yPos);
        pdf.text(`€${item.total.toFixed(2)}`, 170, yPos);
        yPos += 10;
      });
    } else {
      pdf.text('Servizi forniti', 20, yPos);
      pdf.text('1', 120, yPos);
      pdf.text(`€${invoice.subtotal.toFixed(2)}`, 140, yPos);
      pdf.text(`€${invoice.subtotal.toFixed(2)}`, 170, yPos);
      yPos += 10;
    }
    
    // Totali
    pdf.line(20, yPos + 5, 190, yPos + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`SUBTOTALE: €${invoice.subtotal.toFixed(2)}`, 120, yPos + 15);
    pdf.text(`IVA (${invoice.tax_rate}%): €${invoice.tax_amount.toFixed(2)}`, 120, yPos + 25);
    pdf.text(`TOTALE: €${invoice.total.toFixed(2)}`, 120, yPos + 35);
    
    // Note
    if (invoice.notes) {
      pdf.setFont('helvetica', 'normal');
      pdf.text('Note:', 20, yPos + 55);
      pdf.text(invoice.notes, 20, yPos + 65);
    }
    
    // Converti in ArrayBuffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    return pdfArrayBuffer;
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto" 
           style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', border: '1px solid' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ borderBottomColor: 'var(--card-border)', borderBottom: '1px solid' }}>
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6" style={{ color: 'var(--btn-bg)' }} />
            <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-color)' }}>
              Invia Fattura via Email
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-color)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Invoice Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-color)' }}>
              Fattura {invoice.invoice_number}
            </h3>
            <div className="text-sm space-y-1" style={{ color: 'var(--text-color)' }}>
              <p><strong>Cliente:</strong> {invoice.customer?.name || 'N/A'}</p>
              <p><strong>Importo:</strong> €{invoice.total.toFixed(2)}</p>
              <p><strong>Data:</strong> {new Date(invoice.issue_date).toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Email destinatario *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                placeholder="cliente@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Oggetto
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Messaggio personalizzato
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                style={{ 
                  borderColor: 'var(--card-border)', 
                  border: '1px solid',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)'
                }}
                placeholder="Messaggio personalizzato per il cliente..."
              />
            </div>
          </div>

          {/* Test Email Section */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={() => setShowTest(!showTest)}
              className="flex items-center space-x-2 text-sm font-medium"
              style={{ color: 'var(--btn-bg)' }}
            >
              <TestTube className="w-4 h-4" />
              <span>Test Email</span>
            </button>
            
            {showTest && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                    Email per test
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors text-base"
                    style={{ 
                      borderColor: 'var(--card-border)', 
                      border: '1px solid',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text-color)'
                    }}
                    placeholder="test@email.com"
                  />
                </div>
                <button
                  onClick={handleSendTest}
                  disabled={loading || !testEmail.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--card-border)',
                    color: 'var(--text-color)'
                  }}
                >
                  {loading ? 'Invio...' : 'Invia Email di Test'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 p-4 sm:p-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition-colors text-base"
            style={{ 
              borderColor: 'var(--card-border)', 
              border: '1px solid',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-color)'
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleSendInvoice}
            disabled={loading || !email.trim()}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 text-base flex items-center justify-center space-x-2"
            style={{ 
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)'
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Invio...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Invia Fattura</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

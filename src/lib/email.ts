import sgMail from '@sendgrid/mail';

// Inizializza SendGrid SOLO se la chiave è valida (evita errori in browser)
const SENDGRID_KEY = import.meta.env.VITE_SENDGRID_API_KEY as string | undefined;
const IS_SENDGRID_CONFIGURED = Boolean(SENDGRID_KEY && SENDGRID_KEY.startsWith('SG.'));
if (IS_SENDGRID_CONFIGURED) {
  try {
    sgMail.setApiKey(SENDGRID_KEY as string);
  } catch (e) {
    // Evita di bloccare il client in caso di errore runtime
    // L'invio email fallirà in modo controllato nelle funzioni sotto
    console.warn('SendGrid non inizializzato:', e);
  }
} else {
  // In sviluppo o produzione senza chiave valida non inizializziamo
  console.warn('SendGrid non configurato: manca VITE_SENDGRID_API_KEY o non inizia con "SG."');
}

export interface EmailInvoiceData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  status: string;
  pdfUrl: string;
  companyName: string;
  companyEmail: string;
  notes?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Template email per fatture
export function generateInvoiceEmailTemplate(data: EmailInvoiceData): EmailTemplate {
  const { 
    customerName, 
    invoiceNumber, 
    invoiceDate, 
    dueDate, 
    total, 
    status, 
    companyName,
    notes 
  } = data;

  const statusText = {
    'draft': 'Bozza',
    'sent': 'Inviata',
    'paid': 'Pagata',
    'overdue': 'Scaduta'
  }[status] || status;

  const subject = `Fattura ${invoiceNumber} - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 2px solid #e3f2fd;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #db5461;
          margin: 0;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          margin: 20px 0 10px 0;
        }
        .invoice-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
        }
        .detail-label {
          font-weight: 600;
          color: #666;
        }
        .detail-value {
          color: #333;
        }
        .total {
          font-size: 20px;
          font-weight: bold;
          color: #db5461;
        }
        .status {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-draft { background: #f3f4f6; color: #6b7280; }
        .status-sent { background: #fef3c7; color: #d97706; }
        .status-paid { background: #d1fae5; color: #059669; }
        .status-overdue { background: #fee2e2; color: #dc2626; }
        .cta-button {
          display: inline-block;
          background: #db5461;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
        .notes {
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 6px 6px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="company-name">${companyName}</h1>
          <h2 class="invoice-title">Fattura ${invoiceNumber}</h2>
        </div>

        <p>Ciao <strong>${customerName}</strong>,</p>
        
        <p>Ti inviamo in allegato la fattura <strong>${invoiceNumber}</strong> per i servizi forniti.</p>

        <div class="invoice-details">
          <div class="detail-row">
            <span class="detail-label">Numero Fattura:</span>
            <span class="detail-value">${invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data Emissione:</span>
            <span class="detail-value">${new Date(invoiceDate).toLocaleDateString('it-IT')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data Scadenza:</span>
            <span class="detail-value">${new Date(dueDate).toLocaleDateString('it-IT')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Stato:</span>
            <span class="detail-value">
              <span class="status status-${status}">${statusText}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Importo Totale:</span>
            <span class="detail-value total">€${total.toFixed(2)}</span>
          </div>
        </div>

        ${notes ? `
          <div class="notes">
            <strong>Note:</strong><br>
            ${notes}
          </div>
        ` : ''}

        <p>La fattura in formato PDF è allegata a questa email. Per qualsiasi domanda, non esitare a contattarci.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.pdfUrl}" class="cta-button" target="_blank">
            📄 Visualizza Fattura PDF
          </a>
        </div>

        <div class="footer">
          <p>Grazie per aver scelto i nostri servizi!</p>
          <p><strong>${companyName}</strong><br>
          Email: ${data.companyEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Fattura ${invoiceNumber} - ${companyName}

Ciao ${customerName},

Ti inviamo la fattura ${invoiceNumber} per i servizi forniti.

Dettagli Fattura:
- Numero: ${invoiceNumber}
- Data Emissione: ${new Date(invoiceDate).toLocaleDateString('it-IT')}
- Data Scadenza: ${new Date(dueDate).toLocaleDateString('it-IT')}
- Stato: ${statusText}
- Importo Totale: €${total.toFixed(2)}

${notes ? `Note: ${notes}` : ''}

La fattura in formato PDF è allegata a questa email.

Grazie per aver scelto i nostri servizi!

${companyName}
Email: ${data.companyEmail}
  `;

  return { subject, html, text };
}

// Funzione per inviare email fattura (tramite Supabase Edge Function)
export async function sendInvoiceEmail(data: EmailInvoiceData, pdfBuffer: ArrayBuffer): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('🚀 INVIO EMAIL REALE - non simulazione!');
    
    // Converti PDF in base64 per l'invio
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    
    // Chiama la Supabase Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        emailData: data,
        pdfBase64: pdfBase64
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        error: result.error || 'Errore invio email' 
      };
    }

    return { 
      success: true, 
      messageId: result.messageId 
    };
  } catch (error: any) {
    console.error('Errore invio email:', error);
    return { 
      success: false, 
      error: error.message || 'Errore sconosciuto' 
    };
  }
}

// Funzione per inviare email di test
export async function sendTestEmail(to: string, companyName: string, companyEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!IS_SENDGRID_CONFIGURED) {
      return { success: false, error: 'Email non configurata in produzione. Configura VITE_SENDGRID_API_KEY.' };
    }
    const msg = {
      to: to,
      from: {
        email: companyEmail,
        name: companyName
      },
      subject: 'Test Email - InvoGen',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #db5461;">Test Email InvoGen</h2>
          <p>Questa è un'email di test per verificare la configurazione del sistema email.</p>
          <p>Se ricevi questa email, il sistema è configurato correttamente! ✅</p>
          <p><strong>${companyName}</strong></p>
        </div>
      `,
      text: 'Test Email InvoGen - Sistema configurato correttamente!'
    };

    const result = await sgMail.send(msg);
    
    return { 
      success: true, 
      messageId: result[0].headers['x-message-id'] as string
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.response?.body?.errors?.[0]?.message || error.message || 'Errore sconosciuto' 
    };
  }
}

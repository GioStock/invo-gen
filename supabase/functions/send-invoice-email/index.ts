import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emailData, pdfBase64 } = await req.json()
    
    // Initialize SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured')
    }

    // Prepare email template
    const template = generateInvoiceEmailTemplate(emailData)
    
    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: 'info.invogenpro@gmail.com',
          name: emailData.companyName
        },
        reply_to: {
          email: emailData.companyEmail,
          name: emailData.companyName
        },
        personalizations: [{
          to: [{ email: emailData.to }],
          subject: template.subject
        }],
        content: [
          {
            type: 'text/plain',
            value: template.text
          },
          {
            type: 'text/html',
            value: template.html
          }
        ],
        attachments: pdfBase64 ? [{
          content: pdfBase64,
          filename: `Fattura_${emailData.invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }] : []
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid error: ${error}`)
    }

    return new Response(
      JSON.stringify({ success: true, messageId: response.headers.get('x-message-id') }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateInvoiceEmailTemplate(data: any) {
  const { 
    customerName, 
    invoiceNumber, 
    invoiceDate, 
    dueDate, 
    total, 
    status, 
    companyName,
    notes 
  } = data

  const statusText = {
    'draft': 'Bozza',
    'sent': 'Inviata',
    'paid': 'Pagata',
    'overdue': 'Scaduta'
  }[status] || status

  const subject = `Fattura ${invoiceNumber} - ${companyName}`

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
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
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
            <span class="detail-label">Importo Totale:</span>
            <span class="detail-value total">€${total.toFixed(2)}</span>
          </div>
        </div>

        ${notes ? `<p><strong>Note:</strong><br>${notes}</p>` : ''}

        <p>La fattura in formato PDF è allegata a questa email. Per qualsiasi domanda, non esitare a contattarci.</p>

        <div class="footer">
          <p>Grazie per aver scelto i nostri servizi!</p>
          <p><strong>${companyName}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Fattura ${invoiceNumber} - ${companyName}

Ciao ${customerName},

Ti inviamo la fattura ${invoiceNumber} per i servizi forniti.

Dettagli Fattura:
- Numero: ${invoiceNumber}
- Data Emissione: ${new Date(invoiceDate).toLocaleDateString('it-IT')}
- Data Scadenza: ${new Date(dueDate).toLocaleDateString('it-IT')}
- Importo Totale: €${total.toFixed(2)}

${notes ? `Note: ${notes}` : ''}

La fattura in formato PDF è allegata a questa email.

Grazie per aver scelto i nostri servizi!

${companyName}
  `

  return { subject, html, text }
}

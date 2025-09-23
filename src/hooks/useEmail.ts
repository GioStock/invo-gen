import { useState } from 'react';
import { sendInvoiceEmail, sendTestEmail, EmailInvoiceData } from '../lib/email';

export function useEmail() {
  const [loading, setLoading] = useState(false);

  const sendInvoice = async (data: EmailInvoiceData, pdfBuffer: ArrayBuffer) => {
    setLoading(true);
    try {
      const result = await sendInvoiceEmail(data, pdfBuffer);
      
      if (result.success) {
        console.log('✅ Email inviata con successo:', data.invoiceNumber);
        return { success: true, messageId: result.messageId };
      } else {
        console.error('❌ Errore invio email:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('❌ Errore invio email (catch):', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async (to: string, companyName: string, companyEmail: string) => {
    setLoading(true);
    try {
      const result = await sendTestEmail(to, companyName, companyEmail);
      
      if (result.success) {
        console.log('✅ Email di test inviata con successo a:', to);
        return { success: true, messageId: result.messageId };
      } else {
        console.error('❌ Errore invio email di test:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('❌ Errore invio email di test (catch):', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    sendInvoice,
    sendTest,
    loading
  };
}

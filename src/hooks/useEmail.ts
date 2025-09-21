import { useState } from 'react';
import { sendInvoiceEmail, sendTestEmail, EmailInvoiceData } from '../lib/email';
import { useToast } from '../components/Toast';

export function useEmail() {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const sendInvoice = async (data: EmailInvoiceData, pdfBuffer: ArrayBuffer) => {
    setLoading(true);
    try {
      const result = await sendInvoiceEmail(data, pdfBuffer);
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Email inviata',
          message: `Fattura ${data.invoiceNumber} inviata con successo a ${data.to}`
        });
        return { success: true, messageId: result.messageId };
      } else {
        addToast({
          type: 'error',
          title: 'Errore invio email',
          message: result.error || 'Errore sconosciuto'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      addToast({
        type: 'error',
        title: 'Errore invio email',
        message: errorMessage
      });
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
        addToast({
          type: 'success',
          title: 'Email di test inviata',
          message: `Email di test inviata con successo a ${to}`
        });
        return { success: true, messageId: result.messageId };
      } else {
        addToast({
          type: 'error',
          title: 'Errore invio email di test',
          message: result.error || 'Errore sconosciuto'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      addToast({
        type: 'error',
        title: 'Errore invio email di test',
        message: errorMessage
      });
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

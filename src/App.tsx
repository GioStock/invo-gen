import React from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceView } from './components/InvoiceView';
import { CustomerList } from './components/CustomerList';
import { CustomerForm } from './components/CustomerForm';
import { Invoice, Customer } from './lib/supabase';
import { useInvoices } from './hooks/useInvoices';
import { useCustomers } from './hooks/useCustomers';
import { Landing } from './components/Landing';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { Settings } from './components/Settings';
import { ToastProvider } from './components/Toast';

type View = 'dashboard' | 'invoices' | 'customers';
type ViewAll = 'dashboard' | 'invoices' | 'customers' | 'settings';

function App() {
  const [session, setSession] = React.useState<any>(null);
  const [authMode, setAuthMode] = React.useState<'none' | 'login' | 'signup'>('none');
  const [currentView, setCurrentView] = React.useState<ViewAll>('dashboard');
  const viewOrder: ViewAll[] = ['dashboard', 'invoices', 'customers', 'settings'];
  const [slideClass, setSlideClass] = React.useState<'view-slide-left' | 'view-slide-right'>('view-slide-right');
  const [showInvoiceForm, setShowInvoiceForm] = React.useState(false);
  const [showInvoiceView, setShowInvoiceView] = React.useState(false);
  const [showCustomerForm, setShowCustomerForm] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  const { getInvoice, refreshInvoices } = useInvoices();
  const { refreshCustomers } = useCustomers();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    const fullInvoice = await getInvoice(invoice.id);
    if (fullInvoice) {
      setSelectedInvoice(fullInvoice);
      setShowInvoiceForm(true);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    const fullInvoice = await getInvoice(invoice.id);
    if (fullInvoice) {
      setSelectedInvoice(fullInvoice);
      setShowInvoiceView(true);
    }
  };

  const handleSaveInvoice = () => {
    setShowInvoiceForm(false);
    setSelectedInvoice(null);
    // 🔄 REFRESH: Aggiorna dati dopo save fattura
    refreshInvoices();
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleSaveCustomer = () => {
    setShowCustomerForm(false);
    setSelectedCustomer(null);
    // 🔄 REFRESH: Aggiorna dati dopo save cliente
    refreshCustomers();
    // Aggiorna anche le fatture perché potrebbero mostrare i nomi clienti
    refreshInvoices();
  };

  const handleSetView = (next: ViewAll) => {
    const fromIndex = viewOrder.indexOf(currentView);
    const toIndex = viewOrder.indexOf(next);
    setSlideClass(toIndex > fromIndex ? 'view-slide-right' : 'view-slide-left');
    setCurrentView(next);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <div key="dashboard" className={slideClass}><Dashboard onViewChange={handleSetView} /></div>;
      case 'invoices':
        return (
          <div key="invoices" className={slideClass}>
            <InvoiceList
              onCreateInvoice={handleCreateInvoice}
              onEditInvoice={handleEditInvoice}
              onViewInvoice={handleViewInvoice}
            />
          </div>
        );
      case 'customers':
        return (
          <div key="customers" className={slideClass}>
            <CustomerList
              onCreateCustomer={handleCreateCustomer}
              onEditCustomer={handleEditCustomer}
            />
          </div>
        );
      case 'settings':
        return (
          <div key="settings" className={slideClass}>
            <Settings />
          </div>
        );
      default:
        return <div className={slideClass}><Dashboard onViewChange={handleSetView} /></div>;
    }
  };

  if (!session) {
    if (authMode === 'login') return <Auth mode="login" onAuthenticated={() => setAuthMode('none')} />;
    if (authMode === 'signup') return <Auth mode="signup" onAuthenticated={() => setAuthMode('none')} />;
    return <Landing onGetStarted={() => setAuthMode('signup')} onLogin={() => setAuthMode('login')} />;
  }

  return (
    <ToastProvider>
      <Layout currentView={currentView} onViewChange={handleSetView}>
        {renderContent()}
      </Layout>

      {showInvoiceForm && (
        <InvoiceForm
          invoice={selectedInvoice}
          onClose={() => {
            setShowInvoiceForm(false);
            setSelectedInvoice(null);
          }}
          onSave={handleSaveInvoice}
        />
      )}

      {showInvoiceView && selectedInvoice && (
        <InvoiceView
          invoice={selectedInvoice}
          onClose={() => {
            setShowInvoiceView(false);
            setSelectedInvoice(null);
          }}
          onEdit={() => {
            setShowInvoiceView(false);
            setShowInvoiceForm(true);
          }}
        />
      )}

      {showCustomerForm && (
        <CustomerForm
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerForm(false);
            setSelectedCustomer(null);
          }}
          onSave={handleSaveCustomer}
        />
      )}
    </ToastProvider>
  );
}

export default App;
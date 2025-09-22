import React from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

// COMPONENTE SECTION ESTERNO - NON SI RI-CREA MAI!
const Section = React.memo(({ title, id, children, summary, isOpen, onToggle }: { 
  title: string; 
  id: string; 
  children: React.ReactNode; 
  summary?: React.ReactNode; 
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 border-b transition-all duration-200 hover:bg-gray-50"
        style={{ borderColor: 'var(--card-border)' }}
        onClick={(e) => { 
          e.preventDefault(); 
          onToggle();
        }}
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="font-semibold" style={{ color: 'var(--text-color)' }}>{title}</h2>
          {summary && <div className="text-sm opacity-70 mt-1">{summary}</div>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">{isOpen ? 'Nascondi' : 'Mostra'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
});

export function Settings() {
  const { addToast } = useToast();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  
  // Dati aziendali
  const [companyData, setCompanyData] = React.useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Italia',
    vat_number: '',
    fiscal_code: '',
    phone: '',
    email: ''
  });

  // OTTIMIZZAZIONE CRITICA: Handlers stabili con useCallback
  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handleEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, email: e.target.value }));
  }, []);

  const handleAddressChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, address: e.target.value }));
  }, []);

  const handleCityChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, city: e.target.value }));
  }, []);

  const handlePostalCodeChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, postal_code: e.target.value }));
  }, []);

  const handleCountryChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, country: e.target.value }));
  }, []);

  const handleVatNumberChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, vat_number: e.target.value }));
  }, []);

  const handleFiscalCodeChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, fiscal_code: e.target.value }));
  }, []);

  const handlePhoneChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData(prev => ({ ...prev, phone: e.target.value }));
  }, []);

  const [open, setOpen] = React.useState<{profile:boolean;brand:boolean}>({ profile: false, brand: false });

  // Memoizza i toggle per evitare re-render
  const toggleProfile = React.useCallback(() => {
    setOpen(prev => ({ ...prev, profile: !prev.profile }));
  }, []);

  const toggleBrand = React.useCallback(() => {
    setOpen(prev => ({ ...prev, brand: !prev.brand }));
  }, []);

  React.useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const userEmail = auth.user?.email || '';
      if (!uid) return;

      // Carica dati aziendali
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', uid)
        .single();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyData({
            name: company.name || '',
            address: company.address || '',
            city: company.city || '',
            postal_code: company.postal_code || '',
            country: company.country || 'Italia',
            vat_number: company.vat_number || '',
            fiscal_code: company.fiscal_code || '',
            phone: company.phone || '',
            // Priorità: 1) Email già salvata in company, 2) Email di registrazione utente
            email: company.email || userEmail
          });

          // Carica logo specifico della company
          const savedLogoUrl = localStorage.getItem(`companyLogoUrl-${profile.company_id}`);
          if (savedLogoUrl) {
            setLogoUrl(savedLogoUrl);
          } else {
            // Prova a caricare il logo dal storage Supabase
            const logoPath = `logo-${profile.company_id}.png`;
            const { data } = supabase.storage.from('branding').getPublicUrl(logoPath);
            if (data?.publicUrl) {
              setLogoUrl(data.publicUrl);
            }
          }
        } else {
          // Se non esiste ancora una company, precarica comunque l'email dell'utente
          setCompanyData(prev => ({
            ...prev,
            email: userEmail
          }));
        }
      } else {
        // Se non c'è nemmeno un profilo, precarica l'email dell'utente
        setCompanyData(prev => ({
          ...prev,
          email: userEmail
        }));
      }
    })();
  }, []);

  const saveCompanyData = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', uid)
        .single();

      if (profile?.company_id) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', profile.company_id);

        if (error) throw error;
        addToast({ type: 'success', title: 'Successo', message: 'Dati aziendali salvati con successo!' });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Errore', message: error.message });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', uid)
        .single();

      if (!profile?.company_id) return;

      // Upload del file
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${profile.company_id}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Ottieni URL pubblico
      const { data: publicUrl } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      if (publicUrl?.publicUrl) {
        setLogoUrl(publicUrl.publicUrl);
        localStorage.setItem(`companyLogoUrl-${profile.company_id}`, publicUrl.publicUrl);
        addToast({ type: 'success', title: 'Successo', message: 'Logo caricato con successo!' });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Errore', message: error.message });
    }
  };

  const removeLogo = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', uid)
        .single();

      if (!profile?.company_id) return;

      setLogoUrl(null);
      localStorage.removeItem(`companyLogoUrl-${profile.company_id}`);
      addToast({ type: 'success', title: 'Successo', message: 'Logo rimosso con successo!' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Errore', message: error.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>Impostazioni</h1>
      
      <Section 
        title="Profilo Aziendale" 
        id="profile" 
        isOpen={open.profile}
        onToggle={toggleProfile}
        summary="Gestisci i dati della tua azienda"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ragione Sociale *</label>
            <input
              type="text"
              value={companyData.name}
              onChange={handleNameChange}
              className="input"
              placeholder="Nome dell'azienda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
              <span className="text-xs text-gray-500 font-normal ml-1">(precaricata dalla registrazione)</span>
            </label>
            <input
              type="email"
              value={companyData.email}
              onChange={handleEmailChange}
              className="input"
              placeholder="email@azienda.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
            <input
              type="text"
              value={companyData.address}
              onChange={handleAddressChange}
              className="input"
              placeholder="Via, numero civico"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
            <input
              type="text"
              value={companyData.city}
              onChange={handleCityChange}
              className="input"
              placeholder="Città"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
            <input
              type="text"
              value={companyData.postal_code}
              onChange={handlePostalCodeChange}
              className="input"
              placeholder="CAP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
            <input
              type="text"
              value={companyData.country}
              onChange={handleCountryChange}
              className="input"
              placeholder="Paese"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
            <input
              type="text"
              value={companyData.vat_number}
              onChange={handleVatNumberChange}
              className="input"
              placeholder="IT12345678901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
            <input
              type="text"
              value={companyData.fiscal_code}
              onChange={handleFiscalCodeChange}
              className="input"
              placeholder="Codice fiscale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              type="tel"
              value={companyData.phone}
              onChange={handlePhoneChange}
              className="input"
              placeholder="+39 123 456 7890"
            />
          </div>
        </div>
        <div className="mt-6">
          <button onClick={saveCompanyData} className="btn-primary" type="button">
            Salva Dati Aziendali
          </button>
        </div>
      </Section>

      <Section 
        title="Brand" 
        id="brand"
        isOpen={open.brand}
        onToggle={toggleBrand}
        summary="Logo caricato"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo Aziendale</label>
            {logoUrl ? (
              <div className="flex items-center space-x-4">
                <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain bg-gray-100 rounded" />
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-secondary"
                  >
                    Cambia Logo
                  </button>
                  <button
                    onClick={removeLogo}
                    className="btn-secondary text-red-600 hover:text-red-700"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary"
              >
                Carica Logo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
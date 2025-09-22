import React from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

export function Settings() {
  console.log('🔄 Settings component re-render');
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

  // Ottimizzazione: callback per aggiornare i dati senza re-render completo
  const updateCompanyField = React.useCallback((field: string, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  }, []);

  const [open, setOpen] = React.useState<{profile:boolean;brand:boolean}>({ profile: false, brand: false });

  // Memoizza il toggle per evitare re-render
  const toggleSection = React.useCallback((id: keyof typeof open) => {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);
  
  
  const Section = React.memo(({ title, id, children, summary }: { title: string; id: keyof typeof open; children: React.ReactNode; summary?: React.ReactNode }) => {
    const isOpen = open[id];
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [maxHeight, setMaxHeight] = React.useState<number>(0);

    React.useEffect(() => {
      if (isOpen) {
        const height = contentRef.current?.scrollHeight || 0;
        setMaxHeight(height);
      } else {
        setMaxHeight(0);
      }
    }, [isOpen]);

    // Evita che l'accordion si chiuda durante l'editing
    React.useEffect(() => {
      if (isOpen && contentRef.current) {
        const height = contentRef.current.scrollHeight;
        if (height !== maxHeight) {
          setMaxHeight(height);
        }
      }
    });

    return (
      <div className="card">
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-4 border-b transition-all duration-200 hover:bg-gray-50"
          style={{ borderColor: 'var(--card-border)' }}
          onClick={(e) => { 
            e.preventDefault(); 
            toggleSection(id);
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
              className={`w-4 h-4 transition-transform duration-1000 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div 
          className="overflow-hidden transition-all duration-1000 ease-in-out"
          style={{ 
            maxHeight: `${maxHeight}px`,
            opacity: isOpen ? 1 : 0
          }}
        >
          <div ref={contentRef} className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  });

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
            email: company.email || userEmail // Usa email utente se non c'è quella aziendale
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
              localStorage.setItem(`companyLogoUrl-${profile.company_id}`, data.publicUrl);
            }
          }
        }
      } else {
        // Se non c'è ancora un'azienda, preimposta almeno l'email dell'utente
        setCompanyData(prev => ({
          ...prev,
          email: userEmail
        }));
      }
    })();
  }, []);

  const saveCompanyData = async () => {
    if (!companyData.name.trim()) {
      addToast({ type: 'error', title: 'Errore', message: 'Il nome dell\'azienda è obbligatorio' });
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;

    try {
      // Trova o crea company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', uid)
        .single();

      let companyId = profile?.company_id;

      if (!companyId) {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyData.name,
            address: companyData.address,
            city: companyData.city,
            postal_code: companyData.postal_code,
            country: companyData.country,
            vat_number: companyData.vat_number,
            fiscal_code: companyData.fiscal_code,
            phone: companyData.phone,
            email: companyData.email
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;

        // Aggiorna profile con company_id
        await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('id', uid);
      } else {
        // Aggiorna company esistente
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: companyData.name,
            address: companyData.address,
            city: companyData.city,
            postal_code: companyData.postal_code,
            country: companyData.country,
            vat_number: companyData.vat_number,
            fiscal_code: companyData.fiscal_code,
            phone: companyData.phone,
            email: companyData.email
          })
          .eq('id', companyId);

        if (updateError) throw updateError;
      }

      addToast({ type: 'success', title: 'Successo', message: 'Dati aziendali salvati' });
    } catch (error) {
      console.error('Errore aggiornamento dati aziendali:', error);
      addToast({ type: 'error', title: 'Errore', message: 'Errore durante il salvataggio' });
    }
  };

  const uploadLogo: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview immediato
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    try {
      // Controlla se l'utente è autenticato
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        addToast({ type: 'error', title: 'Errore', message: 'Devi essere autenticato per caricare un logo' });
        return;
      }

      // Ottieni company_id dell'utente corrente
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', auth.user.id)
        .single();

      if (!profile?.company_id) {
        addToast({ type: 'error', title: 'Errore', message: 'Profilo aziendale non trovato' });
        return;
      }

      const companyId = profile.company_id;
      
      // Upload su Supabase con nome univoco per company
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo-${companyId}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        addToast({ type: 'error', title: 'Errore Upload', message: uploadError.message });
        return;
      }
      
      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(path);
      if (urlData?.publicUrl) {
        localStorage.setItem(`companyLogoUrl-${companyId}`, urlData.publicUrl);
        setLogoUrl(urlData.publicUrl);
        addToast({ type: 'success', title: 'Successo', message: 'Logo aggiornato' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      addToast({ type: 'error', title: 'Errore', message: 'Errore durante l\'upload' });
    }
  };

  const removeLogo = async () => {
    try {
      // Ottieni company_id per rimuovere il logo corretto
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', auth.user.id)
        .single();

      if (profile?.company_id) {
        // Rimuovi dal localStorage
        localStorage.removeItem(`companyLogoUrl-${profile.company_id}`);
        
        // Rimuovi da Supabase Storage
        const logoPath = `logo-${profile.company_id}.png`;
        await supabase.storage.from('branding').remove([logoPath]);
      }
      
      setLogoUrl(null);
      addToast({ type: 'info', title: 'Info', message: 'Logo rimosso' });
    } catch (error) {
      console.error('Errore rimozione logo:', error);
      addToast({ type: 'error', title: 'Errore', message: 'Errore durante la rimozione del logo' });
    }
  };

  const Toast = ({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) => (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}>
      {message}
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>Impostazioni</h1>

      <Section 
        title="Profilo Aziendale" 
        id="profile" 
        summary={<span>{companyData.name || '—'} • {companyData.email || '—'}</span>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ragione Sociale *</label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => updateCompanyField('name', e.target.value)}
              className="input"
              placeholder="Nome dell'azienda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={companyData.email}
              onChange={(e) => updateCompanyField('email', e.target.value)}
              className="input"
              placeholder="email@azienda.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
            <input
              type="text"
              value={companyData.address}
              onChange={(e) => updateCompanyField('address', e.target.value)}
              className="input"
              placeholder="Via, numero civico"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
            <input
              type="text"
              value={companyData.city}
              onChange={(e) => updateCompanyField('city', e.target.value)}
              className="input"
              placeholder="Città"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
            <input
              type="text"
              value={companyData.postal_code}
              onChange={(e) => updateCompanyField('postal_code', e.target.value)}
              className="input"
              placeholder="CAP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
            <input
              type="text"
              value={companyData.country}
              onChange={(e) => updateCompanyField('country', e.target.value)}
              className="input"
              placeholder="Paese"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
            <input
              type="text"
              value={companyData.vat_number}
              onChange={(e) => updateCompanyField('vat_number', e.target.value)}
              className="input"
              placeholder="IT12345678901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
            <input
              type="text"
              value={companyData.fiscal_code}
              onChange={(e) => updateCompanyField('fiscal_code', e.target.value)}
              className="input"
              placeholder="Codice fiscale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              type="tel"
              value={companyData.phone}
              onChange={(e) => updateCompanyField('phone', e.target.value)}
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

      <Section title="Brand" id="brand" summary={logoUrl ? <span>Logo caricato</span> : <span>Nessun logo</span>}>
        <div className="space-y-4">
          {logoUrl && (
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="Logo preview" className="h-16 w-auto object-contain border rounded" />
              <div className="flex gap-2">
                <button className="btn" onClick={() => fileRef.current?.click()} type="button">Cambia Logo</button>
                <button className="btn-ghost text-red-600" onClick={removeLogo} type="button">Rimuovi</button>
              </div>
            </div>
          )}
          {!logoUrl && (
            <div className="flex items-center gap-4">
              <div className="h-16 w-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 text-sm">
                Nessun logo
              </div>
              <button className="btn" onClick={() => fileRef.current?.click()} type="button">Carica Logo</button>
            </div>
          )}
          <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={uploadLogo} />
        </div>
      </Section>

    </div>
  );
}
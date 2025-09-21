import React from 'react';
import { FileText, Users, BarChart3, LogOut, Menu, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'invoices' | 'customers' | 'settings';
  onViewChange: (view: 'dashboard' | 'invoices' | 'customers' | 'settings') => void;
}

export function Layout({ children, currentView, onViewChange }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'invoices', name: 'Fatture', icon: FileText },
    { id: 'customers', name: 'Clienti', icon: Users },
    { id: 'settings', name: 'Impostazioni', icon: Settings },
  ] as const;

  // Animated active indicator for top navbar
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 });

  React.useEffect(() => {
    const activeEl = buttonRefs.current[currentView];
    if (activeEl) {
      const { offsetLeft, offsetWidth } = activeEl;
      setIndicator({ left: offsetLeft, width: offsetWidth });
    }
  }, [currentView]);

  return (
    <div className="app-shell">
      {/* Top horizontal navbar */}
      <header
        className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b print:hidden"
        style={{
          backgroundColor: 'var(--navbar-bg)',
          borderColor: 'var(--card-border)'
        }}
      >
        <div className="page-container">
          <div className="flex items-center h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 mr-3"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" style={{ color: 'var(--text-color)' }} />
              ) : (
                <Menu className="w-6 h-6" style={{ color: 'var(--text-color)' }} />
              )}
            </button>

            <div className="flex items-center space-x-2 mr-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                   style={{ background: 'var(--btn-bg)' }}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold" style={{ color: 'var(--text-color)' }}>Invo Gen</span>
            </div>
            {/* Desktop navigation - hidden on mobile */}
            <nav className="relative flex-1 overflow-x-auto hidden md:block">
              <div className="relative inline-flex items-center gap-1">
                {/* Animated indicator */}
                <span
                  className="absolute bottom-[-8px] h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ left: indicator.left, width: indicator.width, background: 'var(--btn-bg)' }}
                />
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => (buttonRefs.current[item.id] = el)}
                      onClick={() => onViewChange(item.id)}
                      className={`px-3 sm:px-4 py-2 rounded-md text-sm font-semibold transition-colors`}
                      style={
                        isActive
                          ? { color: 'var(--btn-bg)', background: 'color-mix(in srgb, var(--btn-bg) 12%, transparent)' }
                          : { color: 'color-mix(in srgb, var(--text-color) 72%, #000 0%)' }
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
            <div className="ml-4 flex items-center gap-3 hidden md:flex">
              <UserSummary />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="fixed top-0 left-0 h-full w-64 shadow-lg"
            style={{ backgroundColor: 'var(--navbar-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-8">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                     style={{ background: 'var(--btn-bg)' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold" style={{ color: 'var(--text-color)' }}>Invo Gen</span>
              </div>
              
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: isActive ? 'var(--btn-bg)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-color)'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--card-border)' }}>
                <UserSummary />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="p-4 sm:p-6">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}

function UserSummary() {
  const [display, setDisplay] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return setDisplay(null);
      
      // Controlla se il profilo esiste
      let { data: profile } = await supabase.from('profiles').select('company_id, email').eq('id', uid).single();
      
      // Se il profilo non esiste, crealo
      if (!profile) {
        const { data: company, error: cErr } = await supabase
          .from('companies')
          .insert([{ name: 'Azienda' }])
          .select()
          .single();
        
        if (cErr) {
          console.error('Errore creazione company:', cErr);
          setDisplay(auth.user.email || null);
          return;
        }
        
        const { error: pErr } = await supabase
          .from('profiles')
          .insert([{ id: uid, email: auth.user.email, company_id: company.id }]);
        
        if (pErr) {
          console.error('Errore creazione profile:', pErr);
          setDisplay(auth.user.email || null);
          return;
        }
        
        // Ricarica il profilo appena creato
        const { data: newProfile } = await supabase.from('profiles').select('company_id, email').eq('id', uid).single();
        profile = newProfile;
      }
      
      if (profile?.company_id) {
        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
        setDisplay(company?.name || profile?.email || null);
      } else {
        setDisplay(profile?.email || null);
      }
    })();
  }, []);
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
  return (
    <div className="hidden sm:flex items-center gap-3">
      {display && <span className="text-sm" style={{ color: 'color-mix(in srgb, var(--text-color) 80%, #000 0%)' }}>{display}</span>}
      <button onClick={logout} className="btn-ghost px-2 py-1" title="Logout">
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
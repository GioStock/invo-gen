import React from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

interface AuthProps {
  mode: Mode;
  onAuthenticated: () => void;
}

export function Auth({ mode, onAuthenticated }: AuthProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const isSignup = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { data: signUp, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const user = signUp.user;
        if (!user) throw new Error('Registrazione fallita');
        // Se la conferma email è abilitata, mostriamo un prompt
        if (signUp.user && !signUp.session) {
          setShowConfirmModal(true);
        }
        // Crea company + profile
        const { data: company, error: cErr } = await supabase
          .from('companies')
          .insert([{ name: companyName || 'Azienda' }])
          .select()
          .single();
        if (cErr) throw cErr;
        await supabase.from('profiles').insert([{ id: user.id, email, company_id: company.id }]);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onAuthenticated();
    } catch (err) {
      const msg = (err as any)?.message || 'Errore';
      if (String(msg).toLowerCase().includes('user already registered') || String(msg).toLowerCase().includes('already registered')) {
        alert('Sei già registrato. Vai su Accedi.');
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert('Ti abbiamo inviato un link per resettare la password via email.');
      setShowResetModal(false);
    } catch (err) {
      alert((err as any)?.message || 'Errore nel reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-md p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{isSignup ? 'Crea account' : 'Accedi'}</h2>
        <div className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda</label>
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="La tua azienda" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
          {loading ? 'Attendere…' : isSignup ? 'Registrati' : 'Entra'}
        </button>
        
        {!isSignup && (
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={() => setShowResetModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Password dimenticata?
            </button>
          </div>
        )}
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">Conferma la tua email</h3>
            <p className="mt-2 text-sm text-gray-600">Ti abbiamo inviato un link di conferma via email. Cliccalo per attivare l'account, poi torna qui e accedi.</p>
            <div className="mt-4 flex justify-center">
              <button className="btn-primary" onClick={() => setShowConfirmModal(false)}>Ok</button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Password</h3>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  className="input" 
                  type="email" 
                  value={resetEmail} 
                  onChange={e => setResetEmail(e.target.value)} 
                  placeholder="Inserisci la tua email"
                  required 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? 'Invio...' : 'Invia Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



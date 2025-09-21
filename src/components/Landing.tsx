import React from 'react';

interface LandingProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

export function Landing({ onGetStarted, onLogin }: LandingProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          Invogen - Crea la tue fatture in un click!
        </h1>
        <p className="mt-4 text-gray-600 text-lg">
          Semplice, veloce e gratuito per iniziare. Gestisci clienti e fatture in pochi minuti.
        </p>
        <div className="mt-8">
          <button onClick={onGetStarted} className="btn-primary text-base px-6 py-3">
            Prova InvoGen Gratis
          </button>
        </div>
        {onLogin && (
          <p className="mt-6 text-sm text-gray-600">
            Hai già un account?{' '}
            <button onClick={onLogin} className="text-blue-600 hover:underline">Accedi</button>
          </p>
        )}
      </div>
    </div>
  );
}



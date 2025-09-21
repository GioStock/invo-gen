import React from 'react';
import { Check, Crown, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, formatPrice, type SubscriptionPlan } from '../lib/stripe';

interface SubscriptionPlansProps {
  currentPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  loading?: boolean;
}

export function SubscriptionPlans({ currentPlan, onSelectPlan, loading }: SubscriptionPlansProps) {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text-color)' }}>
          Scegli il tuo piano
        </h2>
        <p className="text-lg mt-2" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
          Inizia gratis, aggiorna quando vuoi
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
          const planKey = key as SubscriptionPlan;
          const isCurrentPlan = currentPlan === planKey;
          const isPro = planKey === 'PRO';
          
          return (
            <div
              key={planKey}
              className={`relative rounded-xl p-8 transition-all duration-200 ${
                isPro ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                border: '1px solid',
                ringColor: isPro ? 'var(--btn-bg)' : 'transparent'
              }}
            >
              {isPro && (
                <div 
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)'
                  }}
                >
                  <Crown className="w-4 h-4 inline mr-1" />
                  Più Popolare
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  {isPro ? (
                    <Crown className="w-6 h-6 mr-2" style={{ color: 'var(--btn-bg)' }} />
                  ) : (
                    <Zap className="w-6 h-6 mr-2" style={{ color: 'var(--text-color)' }} />
                  )}
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
                    {plan.name}
                  </h3>
                </div>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold" style={{ color: 'var(--text-color)' }}>
                    {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                      /mese
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check 
                      className="w-5 h-5 mr-3 flex-shrink-0" 
                      style={{ color: 'var(--btn-bg)' }}
                    />
                    <span style={{ color: 'var(--text-color)' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelectPlan(planKey)}
                disabled={loading || isCurrentPlan}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  backgroundColor: isPro ? 'var(--btn-bg)' : 'transparent',
                  color: isPro ? 'var(--btn-text)' : 'var(--btn-bg)',
                  border: isPro ? 'none' : '2px solid var(--btn-bg)'
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentPlan && !loading) {
                    e.currentTarget.style.backgroundColor = isPro ? 'var(--btn-bg-hover)' : 'var(--btn-bg)';
                    e.currentTarget.style.color = 'var(--btn-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentPlan && !loading) {
                    e.currentTarget.style.backgroundColor = isPro ? 'var(--btn-bg)' : 'transparent';
                    e.currentTarget.style.color = isPro ? 'var(--btn-text)' : 'var(--btn-bg)';
                  }
                }}
              >
                {loading ? (
                  'Caricamento...'
                ) : isCurrentPlan ? (
                  'Piano Attuale'
                ) : planKey === 'FREE' ? (
                  'Inizia Gratis'
                ) : (
                  'Aggiorna a Pro'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


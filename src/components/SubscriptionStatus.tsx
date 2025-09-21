import React from 'react';
import { Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { SUBSCRIPTION_PLANS, formatPrice } from '../lib/stripe';

export function SubscriptionStatus() {
  const { 
    subscription, 
    usage, 
    loading, 
    canCreateInvoice, 
    canCreateCustomer,
    getRemainingInvoices,
    getRemainingCustomers,
    upgradeToProPlan 
  } = useSubscription();

  const [upgrading, setUpgrading] = React.useState(false);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    console.log('SubscriptionStatus: subscription is null');
    return null;
  }

  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  const remainingInvoices = getRemainingInvoices();
  const remainingCustomers = getRemainingCustomers();
  
  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const result = await upgradeToProPlan();
      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        alert('Errore durante l\'upgrade: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Errore durante l\'upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  const getStatusIcon = () => {
    switch (subscription.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'past_due':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'canceled':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (subscription.status) {
      case 'active':
        return 'Attivo';
      case 'past_due':
        return 'Pagamento in ritardo';
      case 'canceled':
        return 'Cancellato';
      default:
        return 'In elaborazione';
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscription.plan === 'PRO' ? (
              <Crown className="w-6 h-6" style={{ color: 'var(--btn-bg)' }} />
            ) : (
              <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'var(--card-border)' }} />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                Piano {plan.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
            </div>
            {plan.price > 0 && (
              <div className="text-sm text-gray-600">
                /mese
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-body space-y-4">
        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <div className="text-2xl font-bold text-gray-900">
              {usage?.invoices_count || 0}
              {remainingInvoices !== -1 && (
                <span className="text-lg font-normal text-gray-600">/{plan.limits.invoices}</span>
              )}
            </div>
            <div className="text-sm text-gray-700">
              Fatture questo mese
            </div>
            {remainingInvoices !== -1 && remainingInvoices <= 2 && (
              <div className="text-xs text-red-500 mt-1">
                {remainingInvoices === 0 ? 'Limite raggiunto!' : `${remainingInvoices} rimaste`}
              </div>
            )}
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50">
            <div className="text-2xl font-bold text-gray-900">
              {usage?.customers_count || 0}
              {remainingCustomers !== -1 && (
                <span className="text-lg font-normal text-gray-600">/{plan.limits.customers}</span>
              )}
            </div>
            <div className="text-sm text-gray-700">
              Clienti totali
            </div>
            {remainingCustomers !== -1 && remainingCustomers <= 5 && (
              <div className="text-xs text-red-500 mt-1">
                {remainingCustomers === 0 ? 'Limite raggiunto!' : `${remainingCustomers} rimasti`}
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Button */}
        {subscription.plan === 'FREE' && (
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm mb-3 text-gray-700">
              Aggiorna a Pro per fatture illimitate e funzionalità avanzate
            </p>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)'
              }}
              onMouseEnter={(e) => !upgrading && (e.currentTarget.style.backgroundColor = 'var(--btn-bg-hover)')}
              onMouseLeave={(e) => !upgrading && (e.currentTarget.style.backgroundColor = 'var(--btn-bg)')}
            >
              {upgrading ? 'Reindirizzamento...' : `Aggiorna a Pro - ${formatPrice(SUBSCRIPTION_PLANS.PRO.price)}/mese`}
            </button>
          </div>
        )}

        {/* Pro Benefits */}
        {subscription.plan === 'PRO' && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--btn-bg)' }}>
              <CheckCircle className="w-4 h-4" />
              <span>Hai accesso a tutte le funzionalità Pro!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


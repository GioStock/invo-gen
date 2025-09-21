import React from 'react';
import { FileText, Users, DollarSign, Clock } from 'lucide-react';
import { Invoice } from '../lib/supabase';
import { useInvoices } from '../hooks/useInvoices';
import { useCustomers } from '../hooks/useCustomers';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { SubscriptionStatus } from './SubscriptionStatus';
import { DashboardSkeleton } from './SkeletonLoader';

interface DashboardProps {
  onViewChange: (view: 'invoices' | 'customers') => void;
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { customers, loading: customersLoading } = useCustomers();
  
  const isLoading = invoicesLoading || customersLoading;

  const stats = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const totalCustomers = customers.length;
    const totalRevenue = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const pendingInvoices = invoices.filter(invoice => invoice.status === 'sent').length;

    return {
      totalInvoices,
      totalCustomers,
      totalRevenue,
      pendingInvoices,
    };
  }, [invoices, customers]);

  const recentInvoices = invoices.slice(0, 5);

  // Charts & KPIs data
  const { monthlyData, momDelta, yoyDelta, topCustomers, topProducts } = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

    const sumByMonth: Record<number, number> = {};
    const sumByMonthPrev: Record<number, number> = {};
    const revenueByCustomer: Record<string, number> = {};
    const revenueByProduct: Record<string, number> = {};

    invoices.forEach(inv => {
      if (inv.status !== 'paid') return;
      const d = new Date(inv.issue_date);
      const m = d.getMonth();
      const y = d.getFullYear();
      if (y === currentYear) sumByMonth[m] = (sumByMonth[m] || 0) + inv.total;
      if (y === lastYear) sumByMonthPrev[m] = (sumByMonthPrev[m] || 0) + inv.total;
      if (inv.customer?.name) revenueByCustomer[inv.customer.name] = (revenueByCustomer[inv.customer.name] || 0) + inv.total;
      if (Array.isArray(inv.invoice_items)) {
        (inv.invoice_items as any[]).forEach((it) => {
          const key = it.description || 'Altro';
          const value = typeof it.total === 'number' ? it.total : (it.quantity || 0) * (it.unit_price || 0);
          revenueByProduct[key] = (revenueByProduct[key] || 0) + value;
        });
      }
    });

    const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
      month: monthNames[i],
      current: Number((sumByMonth[i] || 0).toFixed(2)),
      prev: Number((sumByMonthPrev[i] || 0).toFixed(2)),
    }));

    const currentMonthIndex = now.getMonth();
    const currentMonth = monthlyData[currentMonthIndex]?.current || 0;
    const prevMonth = monthlyData[currentMonthIndex - 1]?.current || 0;
    const lastYearSameMonth = monthlyData[currentMonthIndex]?.prev || 0;

    const momDelta = prevMonth === 0 ? (currentMonth > 0 ? 1 : 0) : (currentMonth - prevMonth) / prevMonth;
    const yoyDelta = lastYearSameMonth === 0 ? (currentMonth > 0 ? 1 : 0) : (currentMonth - lastYearSameMonth) / lastYearSameMonth;

    const topCustomers = Object.entries(revenueByCustomer)
      .sort((a,b) => b[1]-a[1])
      .slice(0,5)
      .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }));

    const topProducts = Object.entries(revenueByProduct)
      .sort((a,b) => b[1]-a[1])
      .slice(0,5)
      .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }));

    return { monthlyData, momDelta, yoyDelta, topCustomers, topProducts };
  }, [invoices]);

  const formatPercent = (v: number) => `${(v*100).toFixed(0)}%`;

  // Ricavi per cliente (donut) - usa le fatture pagate
  const revenueByCustomerChart = React.useMemo(() => {
    const totals: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status !== 'paid') return;
      const key = inv.customer?.name || 'Sconosciuto';
      totals[key] = (totals[key] || 0) + inv.total;
    });
    const data = Object.entries(totals).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
    return data;
  }, [invoices]);

  const activity = React.useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const created = invoices.filter(i => new Date(i.created_at) >= since).length;
    const paid = invoices.filter(i => i.status === 'paid' && new Date(i.updated_at) >= since).length;
    const sent = invoices.filter(i => i.status === 'sent' && new Date(i.updated_at) >= since).length;
    return { created, paid, sent };
  }, [invoices]);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Bozza';
      case 'sent': return 'Inviata';
      case 'paid': return 'Pagata';
      case 'overdue': return 'Scaduta';
      default: return status;
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Panoramica del tuo business</p>
      </div>

      {/* Subscription Status */}
      <SubscriptionStatus />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totale Fatture</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clienti</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ricavi Totali</p>
              <p className="text-3xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Attesa</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingInvoices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ricavi mensili</h2>
          </div>
          <div className="card-body">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#db5461" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#db5461" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8aa29e" />
                  <XAxis dataKey="month" stroke="#686963" />
                  <YAxis stroke="#686963" />
                  <Tooltip formatter={(v: any) => `€${Number(v).toFixed(2)}`} />
                  <Area type="monotone" dataKey="prev" stroke="#8aa29e" fillOpacity={0.15} fill="#8aa29e" name="Anno precedente" />
                  <Area type="monotone" dataKey="current" stroke="#db5461" fillOpacity={1} fill="url(#colorCurrent)" name="Anno corrente" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-4 sm:p-6">
            <p className="text-sm text-gray-600">MoM (mese su mese)</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatPercent(momDelta)}</p>
            <p className={`mt-1 text-sm ${momDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>{momDelta >= 0 ? 'In crescita' : 'In calo'}</p>
          </div>
          <div className="card p-4 sm:p-6">
            <p className="text-sm text-gray-600">YoY (vs stesso mese anno scorso)</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatPercent(yoyDelta)}</p>
            <p className={`mt-1 text-sm ${yoyDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>{yoyDelta >= 0 ? 'In crescita' : 'In calo'}</p>
          </div>
        </div>
      </div>

      {/* Revenue by customer & Activity & lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Donut Ricavi per cliente */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Ricavi per cliente</h3>
          </div>
          <div className="card-body">
            {revenueByCustomerChart.length === 0 ? (
              <p className="text-sm text-gray-500">Ancora nessun dato</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueByCustomerChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                      {revenueByCustomerChart.map((_e, i) => (
                        <Cell key={`c-${i}`} fill={['#db5461','#8aa29e','#686963','#e3f2fd','#fafafa'][i % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `€${Number(v).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Attività (ultimi 30 giorni)</h3>
          </div>
          <div className="card-body grid grid-cols-3 gap-4">
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#8aa29e' }}>
              <p className="text-sm" style={{ color: '#fafafa' }}>Create</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: '#fafafa' }}>{activity.created}</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#8aa29e' }}>
              <p className="text-sm" style={{ color: '#fafafa' }}>Inviate</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: '#fafafa' }}>{activity.sent}</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#8aa29e' }}>
              <p className="text-sm" style={{ color: '#fafafa' }}>Pagate</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: '#fafafa' }}>{activity.paid}</p>
            </div>
          </div>
        </div>

        {/* Fatture Recenti */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Fatture Recenti</h2>
              <button onClick={() => onViewChange('invoices')} className="btn-ghost text-sm">Vedi tutte</button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInvoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">Nessuna fattura presente</div>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                        <span className={`badge ${invoice.status === 'draft' ? 'badge-gray' : invoice.status === 'sent' ? 'badge-yellow' : invoice.status === 'paid' ? 'badge-green' : 'badge-red'}`}>{getStatusText(invoice.status)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{invoice.customer?.name || 'Cliente sconosciuto'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">€{invoice.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{new Date(invoice.issue_date).toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Fatture Recenti</h2>
            <button
              onClick={() => onViewChange('invoices')}
              className="btn-ghost text-sm"
            >
              Vedi tutte
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {recentInvoices.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Nessuna fattura presente
            </div>
          ) : (
            recentInvoices.map((invoice) => (
              <div key={invoice.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                      <p className="font-medium text-gray-900 truncate">{invoice.invoice_number}</p>
                      <span className={`badge self-start ${
                        invoice.status === 'draft' ? 'badge-gray' :
                        invoice.status === 'sent' ? 'badge-yellow' :
                        invoice.status === 'paid' ? 'badge-green' :
                        'badge-red'
                      }`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {invoice.customer?.name || 'Cliente sconosciuto'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">€{invoice.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{new Date(invoice.issue_date).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
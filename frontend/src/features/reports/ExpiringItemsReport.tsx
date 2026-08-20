import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { generateAndDownloadPdf } from '@/lib/pdf';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface ExpiringItemsResponse {
  kpis: {
    within_30: number;
    within_60: number;
    expired: number;
    value_at_risk: number;
  };
  chart_data: Array<{
    bucket: string;
    count: number;
  }>;
  table_data: Array<{
    item_name: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    days_to_expiry: number | string;
    unit_cost: number;
    value_at_risk: number;
    urgency: string;
  }>;
}

export function ExpiringItemsReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';
  const [window_, setWindow_] = useState(searchParams.get('window') || '90');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-expiring-items', branchId, window_],
    queryFn: () =>
      httpClient.get<ExpiringItemsResponse>('/reports/expiring-items', {
        params: { branch_id: branchId, window: window_ }
      })
  });

  const handleFilterChange = (key: string, value: string): void => {
    const newParams = new URLSearchParams(searchParams);
    if (value) { newParams.set(key, value); } else { newParams.delete(key); }
    setSearchParams(newParams);
    if (key === 'branch_id') return;
    if (key === 'window') setWindow_(value);
  };

  const exportCSV = (): void => {
    if (!data) return;
    const headers = ['Item', 'Batch', 'Qty', 'Expiry', 'Days Left', 'Unit Cost', 'Value at Risk', 'Urgency'];
    const rows = data.table_data.map(row => [`"${row.item_name}"`, row.batch_number, row.quantity.toString(), row.expiry_date, row.days_to_expiry.toString(), row.unit_cost.toString(), row.value_at_risk.toString(), row.urgency]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expiring_items_${window_}d.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Expiring Items</h1>
          <p className="text-stone-500 text-sm">Items approaching or past their expiry date.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-3 bg-stone-50 w-full sm:w-auto dark:bg-stone-950 p-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm print:hidden">
          {isSuperadmin && (
            <div className="flex items-center bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-1.5 w-full sm:w-auto">
              <Icon name="branches" size={16} className="text-stone-400 mr-2" />
              <select value={branchId} onChange={(e) => handleFilterChange('branch_id', e.target.value)} className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-0 pr-6 w-full">
                <option value="">All Branches</option>
                {branches.map(b => (<option key={b.id} value={b.id.toString()}>{b.name}</option>))}
              </select>
            </div>
          )}
          <div className="flex items-center bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-1.5">
            <Icon name="calendar" size={16} className="text-stone-400 mr-2" />
            <select value={window_} onChange={(e) => handleFilterChange('window', e.target.value)} className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-0 pr-6">
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
              <option value="180">Next 6 months</option>
            </select>
          </div>
          <button onClick={exportCSV} disabled={!data || data.table_data.length === 0} className="flex justify-center items-center gap-2 bg-white w-full sm:w-auto dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"><Icon name="download" size={16} /> CSV</button>
          <button onClick={() => generateAndDownloadPdf('expiring-items', { window: window_, branch_id: branchId })} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
        </div>
      </div>

      {isLoading && <div className="p-12 text-center text-stone-500 font-medium animate-pulse">Loading report data...</div>}
      {isError && (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <div className="text-6xl">⚠️</div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">Failed to load report data</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700">Retry</button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Expiring in 30d</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">{data.kpis.within_30.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Expiring in 60d</h3>
              <p className="mt-2 text-3xl font-black text-orange-600">{data.kpis.within_60.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Already Expired</h3>
              <p className="mt-2 text-3xl font-black text-rose-600">{data.kpis.expired.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Value at Risk</h3>
              <p className="mt-2 text-3xl font-black text-stone-800 dark:text-stone-100">Ksh {data.kpis.value_at_risk.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Expiry Window Distribution</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [value, 'Items']} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No expiring items found.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Expiring Batch Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Item</th>
                    <th className="px-6 py-3 whitespace-nowrap">Batch</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Qty</th>
                    <th className="px-6 py-3 whitespace-nowrap">Expiry</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Days Left</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Value at Risk</th>
                    <th className="px-6 py-3 whitespace-nowrap">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-stone-400">No expiring items found.</td></tr>
                  ) : (
                    data.table_data.map((row, i) => (
                      <tr key={`${row.batch_number}-${i}`} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.item_name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{row.batch_number}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.expiry_date || '-'}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.days_to_expiry}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium">Ksh {row.value_at_risk.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                            row.urgency === 'Expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : row.urgency === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                            : row.urgency === 'Warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400'
                          }`}>{row.urgency}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

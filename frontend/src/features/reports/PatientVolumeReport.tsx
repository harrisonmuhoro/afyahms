import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface PatientVolumeResponse {
  kpis: {
    total: number;
    new_patients: number;
    returning: number;
    ratio: string;
  };
  chart_data: Array<{
    date: string;
    new_patients: number;
    returning: number;
  }>;
  table_data: Array<{
    date: string;
    total: number;
    new_patients: number;
    returning: number;
  }>;
}

export function PatientVolumeReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-patient-volume', from, to, branchId],
    queryFn: () =>
      httpClient.get<PatientVolumeResponse>('/reports/patient-volume', {
        params: { from, to, branch_id: branchId }
      })
  });

  const handleFilterChange = (key: string, value: string): void => {
    const newParams = new URLSearchParams(searchParams);
    if (value) { newParams.set(key, value); } else { newParams.delete(key); }
    setSearchParams(newParams);
  };

  const exportCSV = (): void => {
    if (!data) return;
    const headers = ['Date', 'Total', 'New Patients', 'Returning'];
    const rows = data.table_data.map(row => [row.date, row.total.toString(), row.new_patients.toString(), row.returning.toString()]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `patient_volume_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Patient Volume</h1>
          <p className="text-stone-500 text-sm">New vs returning patient visits over the selected period.</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 w-full sm:w-auto">
            <Icon name="calendar" size={16} className="text-stone-400" />
            <input type="date" value={from} onChange={(e) => handleFilterChange('from', e.target.value)} className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-1 cursor-pointer w-full sm:w-auto" />
            <span className="hidden sm:inline text-stone-300">|</span>
            <input type="date" value={to} onChange={(e) => handleFilterChange('to', e.target.value)} className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-1 cursor-pointer w-full sm:w-auto" />
          </div>
          <button onClick={exportCSV} disabled={!data || data.table_data.length === 0} className="flex justify-center items-center gap-2 bg-white w-full sm:w-auto dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"><Icon name="download" size={16} /> CSV</button>
          <button onClick={() => window.print()} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
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
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Visits</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.total.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">New Patients</h3>
              <p className="mt-2 text-3xl font-black text-emerald-600">{data.kpis.new_patients.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Returning</h3>
              <p className="mt-2 text-3xl font-black text-purple-600">{data.kpis.returning.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">New:Return Ratio</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">{data.kpis.ratio}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">New vs Returning Patients</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelFormatter={(l) => `Date: ${l}`} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="new_patients" name="New Patients" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="returning" name="Returning" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available for selected period.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Daily Volume Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Total</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">New</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Returning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-stone-400">No patient volume data for the selected period.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.date} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.date}</td>
                        <td className="px-6 py-4 text-right font-medium tabular-nums">{row.total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-emerald-600">{row.new_patients.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-purple-600">{row.returning.toLocaleString()}</td>
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

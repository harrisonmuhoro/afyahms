import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { generateAndDownloadPdf } from '@/lib/pdf';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface PrescriptionsIssuedResponse {
  kpis: {
    total_prescriptions: number;
    unique_medications: number;
    most_prescribed: string;
    fully_dispensed: number;
  };
  chart_data: Array<{
    medication: string;
    count: number;
  }>;
  table_data: Array<{
    id: number;
    date: string;
    doctor_name: string;
    medication: string;
    status: string;
  }>;
}

export function PrescriptionsIssuedReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-prescriptions-issued', from, to, branchId],
    queryFn: () =>
      httpClient.get<PrescriptionsIssuedResponse>('/reports/prescriptions-issued', {
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
    const headers = ['Rx ID', 'Date', 'Doctor', 'Medications', 'Status'];
    const rows = data.table_data.map(row => [row.id.toString(), row.date, `"${row.doctor_name}"`, `"${row.medication}"`, row.status]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prescriptions_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Prescriptions Issued</h1>
          <p className="text-stone-500 text-sm">Medications prescribed and dispensed to patients.</p>
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
          <button onClick={() => generateAndDownloadPdf('prescriptions-issued', { from, to, branch_id: branchId })} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
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
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Prescriptions</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.total_prescriptions.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Unique Medications</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.unique_medications.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Most Prescribed</h3>
              <p className="mt-2 text-xl font-black text-red-600 truncate" title={data.kpis.most_prescribed}>{data.kpis.most_prescribed}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Fully Dispensed</h3>
              <p className="mt-2 text-3xl font-black text-emerald-600">{data.kpis.fully_dispensed.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Top 10 Prescribed Medications</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="medication" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [value, 'Quantity']} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available for selected period.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Prescription Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Rx ID</th>
                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 whitespace-nowrap">Doctor</th>
                    <th className="px-6 py-3 whitespace-nowrap w-1/3">Medications</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-400">No prescriptions found for the selected period.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold">RX-{row.id.toString().padStart(5, '0')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                        <td className="px-6 py-4 font-medium">{row.doctor_name}</td>
                        <td className="px-6 py-4">
                          <div className="truncate max-w-sm" title={row.medication}>{row.medication}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                            row.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : row.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400'
                          }`}>{row.status}</span>
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

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { httpClient } from '@/lib/http';
import { generateAndDownloadPdf } from '@/lib/pdf';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface LabResultsResponse {
  kpis: {
    total_ordered: number;
    completed: number;
    pending: number;
    avg_tat_minutes: number | string;
  };
  chart_data: Array<{
    category: string;
    count: number;
  }>;
  table_data: Array<{
    public_id: string;
    date_ordered: string;
    patient_name: string;
    test_name: string;
    category: string;
    status: string;
    date_resulted: string;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export function LabResultsReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-lab-results', from, to, branchId],
    queryFn: () =>
      httpClient.get<LabResultsResponse>('/reports/lab-results', {
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
    const headers = ['Order ID', 'Date Ordered', 'Patient', 'Test', 'Category', 'Status', 'Date Resulted'];
    const rows = data.table_data.map(row => [row.public_id, row.date_ordered, `"${row.patient_name}"`, `"${row.test_name}"`, row.category, row.status, row.date_resulted]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lab_results_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTat = (minutes: number | string) => {
    if (typeof minutes === 'string') return minutes;
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Lab Results</h1>
          <p className="text-stone-500 text-sm">Laboratory test volume, status, and turnaround times.</p>
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
          <button onClick={() => generateAndDownloadPdf('lab-results', { from, to, branch_id: branchId })} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
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
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Ordered</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.total_ordered.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Completed</h3>
              <p className="mt-2 text-3xl font-black text-emerald-600">{data.kpis.completed.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Pending</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">{data.kpis.pending.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Avg TAT</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{formatTat(data.kpis.avg_tat_minutes)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Tests by Category</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.chart_data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count" nameKey="category">
                      {data.chart_data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [value, 'Tests']} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available for selected period.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Lab Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-3 whitespace-nowrap">Ordered</th>
                    <th className="px-6 py-3 whitespace-nowrap">Patient</th>
                    <th className="px-6 py-3 whitespace-nowrap w-1/4">Test</th>
                    <th className="px-6 py-3 whitespace-nowrap">Category</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 whitespace-nowrap">Resulted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-stone-400">No lab orders found for the selected period.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.public_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold">{row.public_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.date_ordered}</td>
                        <td className="px-6 py-4 font-medium">{row.patient_name}</td>
                        <td className="px-6 py-4">{row.test_name}</td>
                        <td className="px-6 py-4">{row.category}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                            row.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : row.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.date_resulted || '-'}</td>
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

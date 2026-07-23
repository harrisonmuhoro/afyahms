import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';

interface RevenueSummaryResponse {
  kpis: {
    total_revenue: number;
    completed_count: number;
    pending_count: number;
  };
  chart_data: Array<{
    date: string;
    revenue: number;
  }>;
  table_data: Array<{
    public_id: string;
    date: string;
    patient_name: string;
    status: string;
    total_amount: number;
    paid_amount: number;
  }>;
}

export function RevenueSummaryReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { branches } = useBranches();
  const isSuperadmin = user?.roles.includes('superadmin') ?? false;

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-revenue-summary', from, to, branchId],
    queryFn: () => 
      httpClient.get<RevenueSummaryResponse>('/reports/revenue-summary', {
        params: { from, to, branch_id: branchId }
      })
  });

  const handleFilterChange = (key: string, value: string): void => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const exportCSV = (): void => {
    if (!data) return;
    const headers = ['Record ID', 'Date', 'Patient Name', 'Status', 'Total Amount', 'Paid Amount'];
    const rows = data.table_data.map(row => [
      row.public_id,
      row.date,
      `"${row.patient_name}"`,
      row.status,
      row.total_amount.toString(),
      row.paid_amount.toString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `revenue-summary-${from || 'all'}-to-${to || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 print:space-y-4 print:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-2 print:hidden"
          >
            <Icon name="arrowRight" className="rotate-180" size={16} /> Back to Reports
          </button>
          <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100">Revenue Summary</h1>
          <p className="mt-1 text-sm text-stone-500">Financial performance overview</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {isSuperadmin && (
            <select
              value={branchId}
              onChange={(e) => handleFilterChange('branch_id', e.target.value)}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id.toString()}>{b.name}</option>
              ))}
            </select>
          )}
          
          <div className="flex justify-center items-center gap-2 bg-white w-full sm:w-auto dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1">
             <Icon name="calendar" size={16} className="text-stone-400" />
             <input
               type="date"
               value={from}
               onChange={(e) => handleFilterChange('from', e.target.value)}
               className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-1 cursor-pointer w-full sm:w-auto"
             />
             <span className="hidden sm:inline text-stone-300">|</span>
             <input
               type="date"
               value={to}
               onChange={(e) => handleFilterChange('to', e.target.value)}
               className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-1 cursor-pointer w-full sm:w-auto"
             />
          </div>
          
          <button 
            onClick={exportCSV} 
            disabled={!data || data.table_data.length === 0}
            className="flex justify-center items-center gap-2 bg-white w-full sm:w-auto dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="download" size={16} /> CSV
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"
          >
            <Icon name="billing" size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {isLoading && <div className="p-12 text-center text-stone-500 font-medium animate-pulse">Loading report data...</div>}
      {isError && <div className="p-12 text-center text-red-500 font-medium">Failed to load report data. Please try again.</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Revenue</h3>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                 Ksh {data.kpis.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Completed Bills</h3>
              <p className="mt-2 text-3xl font-black text-stone-800 dark:text-stone-100">
                 {data.kpis.completed_count.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Pending Bills</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">
                 {data.kpis.pending_count.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Revenue Trend</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">
                   No data available for selected period.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
               <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Bill Records</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                   <tr>
                     <th className="px-6 py-3 whitespace-nowrap">Record ID</th>
                     <th className="px-6 py-3 whitespace-nowrap">Date</th>
                     <th className="px-6 py-3 whitespace-nowrap">Patient</th>
                     <th className="px-6 py-3 whitespace-nowrap">Status</th>
                     <th className="px-6 py-3 text-right whitespace-nowrap">Total Amount</th>
                     <th className="px-6 py-3 text-right whitespace-nowrap">Paid Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                   {data.table_data.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="px-6 py-8 text-center text-stone-400">No records found matching filters.</td>
                     </tr>
                   ) : (
                     data.table_data.map((row) => (
                       <tr key={row.public_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                         <td className="px-6 py-4 font-mono text-xs">{row.public_id.substring(0, 8)}...</td>
                         <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-medium">{row.patient_name}</td>
                         <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                              row.status === 'cleared' || row.status === 'waived'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}>
                              {row.status}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right tabular-nums">{row.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                         <td className="px-6 py-4 text-right font-medium tabular-nums">{row.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

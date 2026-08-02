import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface OutstandingInvoicesResponse {
  kpis: {
    total_outstanding: number;
    fully_unpaid: number;
    partially_paid: number;
    oldest_unpaid: string;
  };
  chart_data: Array<{
    bucket: string;
    amount: number;
  }>;
  table_data: Array<{
    public_id: string;
    date: string;
    patient_name: string;
    service: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    days_outstanding: number;
    status: string;
  }>;
}

export function OutstandingInvoicesReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();
  
  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-outstanding-invoices', from, to, branchId],
    queryFn: () => 
      httpClient.get<OutstandingInvoicesResponse>('/reports/outstanding-invoices', {
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
    const headers = ['Invoice ID', 'Date Issued', 'Patient', 'Service', 'Invoice Amount', 'Amount Paid', 'Balance Due', 'Days Outstanding', 'Status'];
    const rows = data.table_data.map(row => [
      row.public_id,
      row.date,
      row.patient_name,
      row.service,
      row.total_amount.toString(),
      row.paid_amount.toString(),
      row.balance.toString(),
      row.days_outstanding.toString(),
      row.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `outstanding_invoices_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/reports')}
            className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors"
          >
            &larr; Back to Reports
          </button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Outstanding Invoices</h1>
          <p className="text-stone-500 text-sm">Aging report of unpaid and partially paid balances.</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-3 bg-stone-50 w-full sm:w-auto dark:bg-stone-950 p-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          {isSuperadmin && (
            <div className="flex items-center bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-1.5 w-full sm:w-auto">
               <Icon name="branches" size={16} className="text-stone-400 mr-2" />
               <select 
                 value={branchId}
                 onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                 className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 p-0 pr-6 w-full"
               >
                 <option value="">All Branches</option>
                 {branches.map(b => (
                   <option key={b.id} value={b.id.toString()}>{b.name}</option>
                 ))}
               </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 w-full sm:w-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Outstanding</h3>
              <p className="mt-2 text-3xl font-black text-rose-600">
                 Ksh {data.kpis.total_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Fully Unpaid</h3>
              <p className="mt-2 text-3xl font-black text-stone-800 dark:text-stone-100">
                 {data.kpis.fully_unpaid.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Partially Paid</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">
                 {data.kpis.partially_paid.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Oldest Unpaid</h3>
              <p className="mt-2 text-3xl font-black text-rose-500">
                 {new Date(data.kpis.oldest_unpaid).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Aging Buckets</h3>
            <div className="h-72 w-full">
              {data.chart_data.length > 0 && data.chart_data.some(d => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis 
                      type="number"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="bucket"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Outstanding']}
                    />
                    <Bar dataKey="amount" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">
                   No outstanding balances in these buckets.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
               <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Unpaid Invoices</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                   <tr>
                     <th className="px-6 py-3 whitespace-nowrap">Invoice ID</th>
                     <th className="px-6 py-3 whitespace-nowrap">Date Issued</th>
                     <th className="px-6 py-3 whitespace-nowrap">Patient</th>
                     <th className="px-6 py-3 whitespace-nowrap">Service</th>
                     <th className="px-6 py-3 text-right whitespace-nowrap">Invoice Amount</th>
                     <th className="px-6 py-3 text-right whitespace-nowrap">Amount Paid</th>
                     <th className="px-6 py-3 text-right whitespace-nowrap">Balance Due</th>
                     <th className="px-6 py-3 text-center whitespace-nowrap">Days</th>
                     <th className="px-6 py-3 whitespace-nowrap">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                   {data.table_data.length === 0 ? (
                     <tr>
                       <td colSpan={9} className="px-6 py-8 text-center text-stone-400">No outstanding invoices found.</td>
                     </tr>
                   ) : (
                     data.table_data.map((row) => (
                       <tr key={row.public_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                         <td className="px-6 py-4 font-mono text-xs">{row.public_id.substring(0, 8)}...</td>
                         <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                         <td className="px-6 py-4 font-medium">{row.patient_name}</td>
                         <td className="px-6 py-4 truncate max-w-[150px]">{row.service}</td>
                         <td className="px-6 py-4 text-right tabular-nums">{row.total_amount.toLocaleString()}</td>
                         <td className="px-6 py-4 text-right tabular-nums">{row.paid_amount.toLocaleString()}</td>
                         <td className="px-6 py-4 text-right font-bold tabular-nums text-rose-600">{row.balance.toLocaleString()}</td>
                         <td className="px-6 py-4 text-center tabular-nums font-mono text-xs">{row.days_outstanding}</td>
                         <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                              row.status === 'Unpaid' 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}>
                              {row.status}
                            </span>
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

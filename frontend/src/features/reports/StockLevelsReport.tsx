import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface StockLevelsResponse {
  kpis: {
    total_items: number;
    below_reorder: number;
    out_of_stock: number;
    total_value: number;
    as_of: string;
  };
  chart_data: Array<{
    item: string;
    quantity: number;
    reorder_level: number;
  }>;
  table_data: Array<{
    item_name: string;
    category: string;
    quantity_on_hand: number;
    reorder_level: number;
    unit_cost: number;
    total_value: number;
    status: string;
  }>;
}

export function StockLevelsReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-stock-levels', branchId],
    queryFn: () =>
      httpClient.get<StockLevelsResponse>('/reports/stock-levels', {
        params: { branch_id: branchId }
      })
  });

  const handleFilterChange = (key: string, value: string): void => {
    const newParams = new URLSearchParams(searchParams);
    if (value) { newParams.set(key, value); } else { newParams.delete(key); }
    setSearchParams(newParams);
  };

  const exportCSV = (): void => {
    if (!data) return;
    const headers = ['Item', 'Category', 'On Hand', 'Reorder Level', 'Unit Cost', 'Total Value', 'Status'];
    const rows = data.table_data.map(row => [`"${row.item_name}"`, `"${row.category}"`, row.quantity_on_hand.toString(), row.reorder_level.toString(), row.unit_cost.toString(), row.total_value.toString(), row.status]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_levels_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Stock Levels</h1>
          <p className="text-stone-500 text-sm">
            Current inventory snapshot.{data?.kpis.as_of && <span className="ml-1 text-stone-400">Showing as of {new Date(data.kpis.as_of).toLocaleString()}</span>}
          </p>
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
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Items</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.total_items.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Below Reorder</h3>
              <p className="mt-2 text-3xl font-black text-amber-600">{data.kpis.below_reorder.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Out of Stock</h3>
              <p className="mt-2 text-3xl font-black text-rose-600">{data.kpis.out_of_stock.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Value</h3>
              <p className="mt-2 text-3xl font-black text-stone-800 dark:text-stone-100">Ksh {data.kpis.total_value.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Bottom 10 Stock Items</h3>
            <div className="h-[400px] w-full">
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis dataKey="item" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number, name: string) => [value, name === 'quantity' ? 'On Hand' : 'Reorder Level']} />
                    <Bar dataKey="quantity" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20} name="On Hand" />
                    <Bar dataKey="reorder_level" fill="#e5e7eb" radius={[0, 4, 4, 0]} maxBarSize={20} name="Reorder Level" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Inventory Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Item</th>
                    <th className="px-6 py-3 whitespace-nowrap">Category</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">On Hand</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Reorder Lvl</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Unit Cost</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Total Value</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-stone-400">No inventory items found.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.item_name} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.item_name}</td>
                        <td className="px-6 py-4">{row.category}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.quantity_on_hand.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.reorder_level.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums">Ksh {row.unit_cost.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium">Ksh {row.total_value.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                            row.status === 'Out of Stock' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : row.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
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

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { httpClient } from '@/lib/http';
import { generateAndDownloadPdf } from '@/lib/pdf';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface QueueThroughputResponse {
  kpis: {
    total_served: number;
    avg_per_day: number;
    busiest_station: string;
    busiest_day: string;
  };
  chart_data: Array<{
    date: string;
    station: string;
    count: number;
  }>;
  table_data: Array<{
    station: string;
    total_served: number;
    avg_per_day: number;
    busiest_day: string;
  }>;
}

export function QueueThroughputReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-queue-throughput', from, to, branchId],
    queryFn: () =>
      httpClient.get<QueueThroughputResponse>('/reports/queue-throughput', {
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
    const headers = ['Station', 'Total Served', 'Avg/Day', 'Busiest Day'];
    const rows = data.table_data.map(row => [`"${row.station}"`, row.total_served.toString(), row.avg_per_day.toString(), row.busiest_day]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `queue_throughput_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transform chart data for grouped bars: pivot by date, one key per station
  const pivotedChart = data ? (() => {
    const byDate: Record<string, Record<string, number>> = {};
    const stations = new Set<string>();
    data.chart_data.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = {};
      byDate[d.date][d.station] = d.count;
      stations.add(d.station);
    });
    return {
      data: Object.entries(byDate).map(([date, vals]) => ({ date, ...vals })).sort((a, b) => a.date.localeCompare(b.date)),
      stations: Array.from(stations),
    };
  })() : { data: [], stations: [] };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Queue Throughput</h1>
          <p className="text-stone-500 text-sm">Patients served per station and day across the facility.</p>
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
          <button onClick={() => generateAndDownloadPdf('queue-throughput', { from, to, branch_id: branchId })} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
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
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Total Served</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{data.kpis.total_served.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Avg Served/Day</h3>
              <p className="mt-2 text-3xl font-black text-emerald-600">{data.kpis.avg_per_day.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Busiest Station</h3>
              <p className="mt-2 text-xl font-black text-blue-600 truncate" title={data.kpis.busiest_station}>{data.kpis.busiest_station}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Busiest Day</h3>
              <p className="mt-2 text-xl font-black text-amber-600">{data.kpis.busiest_day}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Throughput by Station &amp; Day</h3>
            <div className="h-72 w-full">
              {pivotedChart.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pivotedChart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelFormatter={(l) => `Date: ${l}`} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    {pivotedChart.stations.map((station, i) => (
                      <Bar key={station} dataKey={station} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available for selected period.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Station Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Station</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Total Served</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Avg/Day</th>
                    <th className="px-6 py-3 whitespace-nowrap">Busiest Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-stone-400">No queue data found for the selected period.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.station} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.station}</td>
                        <td className="px-6 py-4 text-right font-medium tabular-nums">{row.total_served.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.avg_per_day}</td>
                        <td className="px-6 py-4">{row.busiest_day}</td>
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

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { httpClient } from '@/lib/http';
import { generateAndDownloadPdf } from '@/lib/pdf';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';

interface AppointmentStatisticsResponse {
  kpis: {
    total_booked: number;
    attended: number;
    missed: number;
    attendance_rate: string;
    no_show_rate: string;
    cancellation_rate: string;
    average_wait_time: number;
  };
  chart_data: Array<{
    date: string;
    booked: number;
    attended: number;
    missed: number;
  }>;
  table_data: Array<{
    date: string;
    booked: number;
    attended: number;
    missed: number;
    rate: string;
  }>;
  channel_split: Array<{ channel: string; count: number }>;
  peak_hours: Array<{ hour: string; count: number }>;
  doctor_utilization: Array<{ doctor: string; appointments: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

export function AppointmentStatisticsReport(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches } = useBranches();
  const { user } = useAuth();

  const from = searchParams.get('from') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const isSuperadmin = user?.roles?.includes('superadmin') || false;
  const branchId = searchParams.get('branch_id') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-appointment-statistics', from, to, branchId],
    queryFn: () =>
      httpClient.get<AppointmentStatisticsResponse>('/reports/appointment-statistics', {
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
    const headers = ['Date', 'Booked', 'Attended', 'Missed', 'Attendance Rate'];
    const rows = data.table_data.map(row => [row.date, row.booked.toString(), row.attended.toString(), row.missed.toString(), row.rate]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointment_statistics_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20 printable-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-medium mb-2 flex items-center gap-1 transition-colors">&larr; Back to Reports</button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Appointment Statistics</h1>
          <p className="text-stone-500 text-sm">Appointment bookings, attendance, wait times, and channel metrics.</p>
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
          <button onClick={() => generateAndDownloadPdf('appointment-statistics', { from, to, branch_id: branchId })} className="flex justify-center items-center gap-2 bg-brand-600 w-full sm:w-auto text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-colors"><Icon name="billing" size={16} /> Print / PDF</button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Booked</h3>
              <p className="mt-2 text-2xl font-black text-blue-600">{data.kpis.total_booked.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Attended</h3>
              <p className="mt-2 text-2xl font-black text-emerald-600">{data.kpis.attended.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Missed</h3>
              <p className="mt-2 text-2xl font-black text-rose-600">{data.kpis.missed.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Attendance</h3>
              <p className="mt-2 text-2xl font-black text-purple-600">{data.kpis.attendance_rate}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Cancellation</h3>
              <p className="mt-2 text-2xl font-black text-orange-600">{data.kpis.cancellation_rate}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">No-show</h3>
              <p className="mt-2 text-2xl font-black text-rose-600">{data.kpis.no_show_rate}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Avg Wait</h3>
              <p className="mt-2 text-2xl font-black text-stone-800 dark:text-stone-100">{data.kpis.average_wait_time} <span className="text-sm font-medium text-stone-500">mins</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Appointment Trend</h3>
              <div className="h-72 w-full">
                {data.chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelFormatter={(l) => `Date: ${l}`} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="booked" name="Booked" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="attended" name="Attended" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="missed" name="Missed" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available for selected period.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Booking Channels</h3>
              <div className="h-64 w-full">
                {data.channel_split && data.channel_split.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.channel_split}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="channel"
                      >
                        {data.channel_split.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Peak Hours (Booked Slots)</h3>
              <div className="h-64 w-full">
                {data.peak_hours && data.peak_hours.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.peak_hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="count" name="Appointments" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400 text-sm">No data available.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Doctor Utilization</h3>
              </div>
              <div className="overflow-y-auto flex-1 max-h-64">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Doctor</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Appointments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                    {data.doctor_utilization && data.doctor_utilization.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-8 text-center text-stone-400">No utilization data available.</td></tr>
                    ) : (
                      data.doctor_utilization?.map((row) => (
                        <tr key={row.doctor} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                          <td className="px-6 py-3 font-medium">{row.doctor}</td>
                          <td className="px-6 py-3 text-right tabular-nums font-bold text-stone-900 dark:text-stone-100">{row.appointments}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Booked</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Attended</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Missed</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {data.table_data.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-400">No appointment data for the selected period.</td></tr>
                  ) : (
                    data.table_data.map((row) => (
                      <tr key={row.date} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.date}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.booked.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-emerald-600">{row.attended.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-rose-600">{row.missed.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium">{row.rate}</td>
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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/Icon';

/* ─── Catalogue metadata ─────────────────────────────────────────────────────── */
type GroupKey = 'financial' | 'clinical' | 'operational' | 'inventory';

interface ReportItem {
  key: string;
  icon: IconName;
  color: string;
}

interface ReportGroup {
  key: GroupKey;
  icon: IconName;
  color: string;
  items: ReportItem[];
}

const GROUPS: ReportGroup[] = [
  {
    key: 'financial',
    icon: 'billing',
    color: 'from-emerald-400 to-teal-500',
    items: [
      { key: 'revenue', icon: 'billing', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
      { key: 'payments', icon: 'payments', color: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400' },
      { key: 'outstanding', icon: 'billing', color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
      { key: 'sha_claims', icon: 'billing', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
    ],
  },
  {
    key: 'clinical',
    icon: 'emr',
    color: 'from-blue-400 to-indigo-500',
    items: [
      { key: 'diagnoses', icon: 'emr', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' },
      { key: 'encounters', icon: 'emr', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
      { key: 'prescriptions', icon: 'emr', color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400' },
      { key: 'lab_results', icon: 'laboratory', color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
    ],
  },
  {
    key: 'operational',
    icon: 'queue',
    color: 'from-amber-400 to-orange-500',
    items: [
      { key: 'queue_throughput', icon: 'queue', color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
      { key: 'wait_times', icon: 'queue', color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
      { key: 'patient_volume', icon: 'patients', color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
      { key: 'appointments', icon: 'patients', color: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400' },
    ],
  },
  {
    key: 'inventory',
    icon: 'inventory',
    color: 'from-slate-400 to-slate-600',
    items: [
      { key: 'stock_levels', icon: 'inventory', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' },
      { key: 'expiring', icon: 'inventory', color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
      { key: 'consumption', icon: 'inventory', color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400' },
    ],
  },
];

/* ─── Report card ────────────────────────────────────────────────────────────── */
interface ReportCardProps {
  item: ReportItem;
  onClick: () => void;
}

function ReportCard({ item, onClick }: ReportCardProps): JSX.Element {
  const { t } = useTranslation(['reports', 'common']);

  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-stone-100 to-white dark:from-stone-800 dark:to-stone-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"></div>
      
      <div className="flex items-start gap-4 relative z-10">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300 ${item.color}`}>
          <Icon name={item.icon} size={24} />
        </span>
        <div className="flex-1">
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 group-hover:text-brand-600 transition-colors">
            {t(`reports:items.${item.key}.name`)}
          </h3>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">
            {t(`reports:items.${item.key}.desc`)}
          </p>
        </div>
      </div>
      
      <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800/50 flex justify-between items-center relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-brand-500 transition-colors">
          View Report
        </span>
        <div className="h-6 w-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20 transition-colors">
          <Icon name="chevronRight" size={14} className="text-stone-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export function ReportsPage(): JSX.Element {
  const { t } = useTranslation(['reports', 'common']);
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleReportClick = (item: ReportItem): void => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    const urlMap: Record<string, string> = {
      'revenue': '/reports/financial/revenue-summary',
      'payments': '/reports/financial/payments-collected',
      'outstanding': '/reports/financial/outstanding-invoices',
      'sha_claims': '/reports/financial/sha-claims',
      'diagnoses': '/reports/clinical/diagnoses-summary',
      'encounters': '/reports/clinical/patient-encounters',
      'prescriptions': '/reports/clinical/prescriptions-issued',
      'lab_results': '/reports/clinical/lab-results',
      'queue_throughput': '/reports/operational/queue-throughput',
      'wait_times': '/reports/operational/wait-times',
      'patient_volume': '/reports/operational/patient-volume',
      'appointments': '/reports/operational/appointment-statistics',
      'stock_levels': '/reports/inventory/stock-levels',
      'expiring': '/reports/inventory/expiring-items',
      'consumption': '/reports/inventory/stock-consumption',
    };

    const path = urlMap[item.key];
    if (path) {
      navigate(`${path}?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-500 dark:from-stone-100 dark:to-stone-400">
            {t('reports:title')}
          </h1>
          <p className="mt-2 text-sm text-stone-500 font-medium">Analytics & Data Insights</p>
        </div>

        {/* ── Date range filters ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/50 dark:bg-stone-900/50 p-2 rounded-2xl border border-stone-200 dark:border-stone-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3">
            <Icon name="calendar" size={16} className="text-stone-400" />
            <input
              type="date"
              className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 cursor-pointer"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs font-bold uppercase text-stone-400">To</span>
            <input
              type="date"
              className="bg-transparent border-none text-sm text-stone-700 dark:text-stone-300 focus:ring-0 cursor-pointer"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Catalogue ────────────────────────────────────────────────────── */}
      <div className="space-y-12">
        {GROUPS.map((group) => (
          <section key={group.key} className="relative">
            {/* Section header */}
            <div className="mb-6 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white shadow-md`}>
                <Icon name={group.icon} size={20} />
              </div>
              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
                {t(`reports:groups.${group.key}`)}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent dark:from-stone-800" />
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => (
                <ReportCard key={item.key} item={item} onClick={() => handleReportClick(item)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

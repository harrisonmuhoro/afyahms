import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/icons/Icon';
import { useInventoryItems } from './api';
import { stockStatus, type StockStatus } from './types';

const STATUS_BADGE: Record<StockStatus, string> = {
  in_stock: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  low: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  out: 'bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse',
};

function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value);
}

export function InventoryPage(): JSX.Element {
  const { t } = useTranslation(['inventory', 'common']);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data, isLoading, error } = useInventoryItems({
    search: search.trim() === '' ? undefined : search.trim(),
    lowStockOnly,
  });

  const stats = useMemo(() => {
    let low = 0;
    let out = 0;
    let value = 0;
    for (const item of data) {
      const status = stockStatus(item);
      if (status === 'low') low += 1;
      if (status === 'out') out += 1;
      value += (item.unit_cost ?? 0) * item.quantity_on_hand;
    }
    return { total: data.length, low, out, value };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-stone-900 dark:bg-stone-100">
            {t('inventory:title')}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{t('inventory:subtitle')}</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300">
            + New Item
          </button>
        </div>
      </div>

      {/* Summary stats - Glassmorphism */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-stone-900/60 border border-white/20 dark:border-stone-800/50 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">{t('inventory:stats.total')}</span>
          <div className="mt-2 text-3xl font-black text-stone-800 dark:text-stone-100">{stats.total}</div>
        </div>
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold tracking-wider text-amber-700/80 dark:text-amber-500/80 uppercase">{t('inventory:stats.low')}</span>
          <div className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-500">{stats.low}</div>
        </div>
        <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100/50 dark:border-red-900/30 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold tracking-wider text-red-700/80 dark:text-red-500/80 uppercase">{t('inventory:stats.out')}</span>
          <div className="mt-2 text-3xl font-black text-red-600 dark:text-red-500">{stats.out}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-stone-900/60 border border-white/20 dark:border-stone-800/50 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">{t('inventory:stats.value')}</span>
          <div className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatMoney(stats.value)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200/50 dark:border-stone-800/50">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inventory:search_placeholder')}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer group px-2">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-stone-200 dark:bg-stone-800 peer-checked:bg-amber-500 transition-colors"></div>
            <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"></div>
          </div>
          <span className="text-sm font-medium text-stone-600 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
            {t('inventory:low_stock_only')}
          </span>
        </label>
      </div>

      {error !== null && (
        <div role="alert" className="p-4 rounded-xl bg-red-50/80 text-red-600 border border-red-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Icon name="close" size={20} />
          <span className="text-sm font-medium">{t('inventory:load_error')}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-stone-200/60 dark:border-stone-800/60 bg-white/80 dark:bg-stone-950/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50/80 dark:bg-stone-900/80 border-b border-stone-200/60 dark:border-stone-800/60">
              <tr>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400">{t('inventory:cols.sku')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400">{t('inventory:cols.name')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400">{t('inventory:cols.category')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400 text-right">{t('inventory:cols.on_hand')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400 text-right">{t('inventory:cols.reorder')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400 text-right">{t('inventory:cols.unit_cost')}</th>
                <th className="px-6 py-4 font-semibold text-stone-600 dark:text-stone-400">{t('common:status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]"></div>
                  </td>
                </tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-900 mb-4">
                      <Icon name="inventory" size={32} className="text-stone-400 dark:text-stone-500" />
                    </div>
                    <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('inventory:empty')}</h3>
                    <p className="mt-1 text-sm text-stone-500">Try adjusting your search filters.</p>
                  </td>
                </tr>
              )}
              {!isLoading && data.map((item) => {
                const status = stockStatus(item);
                return (
                  <tr key={item.id} className="group hover:bg-stone-50/80 dark:hover:bg-stone-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-stone-500">{item.sku}</td>
                    <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100 group-hover:text-brand-600 transition-colors">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-stone-600 dark:text-stone-400">
                      {item.category ? (
                        <span className="px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-xs font-medium">
                          {item.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-stone-900 dark:text-stone-100">
                      {item.quantity_on_hand} <span className="text-stone-400 font-normal text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-stone-500">{item.reorder_level}</td>
                    <td className="px-6 py-4 text-right font-medium text-stone-700 dark:text-stone-300">
                      {formatMoney(item.unit_cost)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_BADGE[status]}`}>
                        {status === 'out' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>}
                        {t(`inventory:status.${status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

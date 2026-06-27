import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/icons/Icon';
import { useAuditLog } from './api';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortSubject(type: string | null): string {
  if (type === null) return '—';
  const parts = type.split('\\');
  return parts[parts.length - 1] ?? type;
}

export function AuditLogPage(): JSX.Element {
  const { t } = useTranslation(['audit', 'common']);
  const [event, setEvent] = useState('');
  const [page, setPage] = useState(1);

  const { data, pagination, isLoading, error } = useAuditLog({
    page,
    event: event.trim() === '' ? undefined : event.trim(),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-500 dark:from-stone-100 dark:to-stone-400">
            {t('audit:title')}
          </h1>
          <p className="mt-2 text-sm text-stone-500 font-medium">System activity and security events</p>
        </div>

        {/* Filter */}
        <div className="relative w-full md:max-w-xs">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="search"
            value={event}
            onChange={(e) => {
              setEvent(e.target.value);
              setPage(1);
            }}
            placeholder={t('audit:filter_placeholder')}
            className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
          />
        </div>
      </div>

      {error !== null && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50/80 text-rose-600 border border-rose-200 backdrop-blur-sm flex items-center gap-3 animate-in fade-in">
          <Icon name="close" size={20} />
          <span className="text-sm font-medium">{t('audit:load_error')}</span>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white/40 dark:bg-stone-950/40 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-3xl p-6 shadow-sm">
        {isLoading && (
          <div className="py-20 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          </div>
        )}
        
        {!isLoading && data.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-900 mb-4">
              <Icon name="audit" size={32} className="text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('audit:empty')}</h3>
            <p className="mt-1 text-sm text-stone-500">No activity events match your criteria.</p>
          </div>
        )}

        {!isLoading && data.length > 0 && (
          <div className="relative border-l-2 border-stone-100 dark:border-stone-800 ml-4 md:ml-8 space-y-8 pb-4">
            {data.map((entry, index) => (
              <div 
                key={entry.id} 
                className="relative pl-8 md:pl-10 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Timeline node */}
                <div className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full border-4 border-white dark:border-stone-950 bg-brand-500 group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(var(--brand-500),0.6)] transition-all duration-300"></div>
                
                {/* Content card */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 rounded-lg">
                        {entry.event}
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        {formatTimestamp(entry.created_at)}
                      </span>
                    </div>
                    {entry.properties?.ip && (
                      <span className="flex items-center gap-1.5 text-xs font-mono text-stone-400 bg-stone-50 dark:bg-stone-900/50 px-2 py-1 rounded-md border border-stone-100 dark:border-stone-800">
                        <Icon name="monitor" size={12} />
                        {entry.properties.ip}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-stone-800 dark:text-stone-200">
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{entry.causer?.name ?? t('audit:system')}</span>
                    <span className="mx-2 text-stone-400">performed action on</span>
                    <span className="font-semibold">{shortSubject(entry.subject_type)}</span>
                    {entry.subject_id !== null && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded text-xs font-mono">
                        #{entry.subject_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination !== null && pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 dark:bg-stone-900/60 p-4 rounded-2xl backdrop-blur-sm border border-stone-200/50 dark:border-stone-800/50">
          <span className="text-sm font-medium text-stone-500">
            {t('audit:page_of', { current: pagination.current_page, total: pagination.last_page })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={pagination.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('common:back')}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('common:next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

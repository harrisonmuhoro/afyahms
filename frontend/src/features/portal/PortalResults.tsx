import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { usePortalResults, type PortalResult } from './api';

const STATUS_COLORS: Record<string, string> = {
  resulted:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  reported:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  collected:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  acquired:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  scheduled:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending:    'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

function ResultCard({ result }: { result: PortalResult }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isAvailable = ['resulted', 'reported'].includes(result.status);
  const iconName = result.source === 'lab' ? 'laboratory' : 'radiology';
  const iconBg = result.source === 'lab'
    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400';
  const dateStr = result.resulted_at ?? result.reported_at ?? result.created_at;
  const dateLabel = dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const statusCls = STATUS_COLORS[result.status] ?? STATUS_COLORS.pending;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <button type="button" onClick={() => isAvailable && setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-5 text-left">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon name={iconName} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-900 dark:text-stone-100">{result.name}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {result.ordered_by ? `Ordered by ${result.ordered_by}` : ''} · {dateLabel}
          </p>
          {result.category && <p className="text-xs text-stone-400">{result.category}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${statusCls}`}>
            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
          </span>
          {isAvailable && (
            <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} className="text-stone-400" />
          )}
        </div>
      </button>

      {expanded && result.result && (
        <div className="border-t border-stone-100 p-5 dark:border-stone-800">
          <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500">Report Details</p>
            <pre className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap dark:text-stone-300">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function PortalResults(): JSX.Element {
  const { data, isLoading } = usePortalResults();
  const results: PortalResult[] = (data as any)?.data ?? [];

  const available = results.filter((r) => ['resulted', 'reported'].includes(r.status));
  const pending   = results.filter((r) => !['resulted', 'reported'].includes(r.status));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Results</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">Lab and radiology results from your recent visits.</p>
      </div>

      {isLoading && <p className="animate-pulse py-8 text-center text-sm text-stone-400">Loading results…</p>}

      {!isLoading && results.length === 0 && (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
          <Icon name="laboratory" size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No results found.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((r) => <ResultCard key={r.id} result={r} />)}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Available ({available.length})
          </h2>
          <div className="space-y-3">
            {available.map((r) => <ResultCard key={r.id} result={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

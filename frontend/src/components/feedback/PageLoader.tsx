/**
 * PageLoader — shown via <Suspense fallback> while a lazy page chunk is loading.
 * Renders a branded, animated skeleton so the user never sees a blank screen.
 */
export function PageLoader(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 dark:bg-stone-950">
      {/* Brand logo / spinner */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer spinning ring */}
        <span
          className="absolute inset-0 rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-stone-700 dark:border-t-brand-400"
          style={{ animation: 'spin 0.9s linear infinite' }}
        />
        {/* Inner pulse dot */}
        <span className="h-5 w-5 rounded-full bg-brand-500 opacity-80 dark:bg-brand-400"
          style={{ animation: 'pulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite' }}
        />
      </div>

      {/* Content skeleton */}
      <div className="w-full max-w-sm space-y-3 px-6">
        <div className="h-3 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-3 w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      </div>

      <p className="text-xs font-medium tracking-widest text-stone-400 dark:text-stone-600 uppercase select-none">
        Loading…
      </p>
    </div>
  );
}

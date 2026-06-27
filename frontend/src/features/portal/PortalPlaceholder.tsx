export function PortalPlaceholder({ title }: { title: string }): JSX.Element {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-8 text-center dark:border-stone-800 dark:bg-stone-900/20">
      <h1 className="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-100">{title}</h1>
      <p className="max-w-md text-stone-500 dark:text-stone-400">
        This section of the patient portal is currently under construction. Please check back later.
      </p>
    </div>
  );
}

import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';
import { Link } from 'react-router-dom';

export function PortalHome(): JSX.Element {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Patient';

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">

      {/* Welcome Header */}
      <section>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 sm:text-4xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Here is a summary of your recent health activity.
        </p>
      </section>

      {/* Empty state */}
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-12 text-center dark:border-stone-800 dark:bg-stone-900/50">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
          <Icon name="medical" size={28} />
        </div>
        <p className="text-base font-medium text-stone-700 dark:text-stone-300">No recent activity</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Your visits, results, and bills will appear here once your care begins.
        </p>
      </div>

      {/* Quick Actions */}
      <section className="pt-2">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/portal/appointments"
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-4 text-center font-bold text-white transition-colors hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            <Icon name="plus" size={20} />
            Book appointment
          </Link>
          <Link
            to="/portal/messages"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Icon name="message" size={20} />
            Message care team
          </Link>
          <Link
            to="/portal/records"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Icon name="download" size={20} />
            Download records
          </Link>
        </div>
      </section>

    </div>
  );
}

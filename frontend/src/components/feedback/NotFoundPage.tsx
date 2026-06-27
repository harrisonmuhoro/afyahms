import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-stone-50 p-6 text-center dark:bg-stone-950">
      <p className="text-6xl font-bold text-brand-700 dark:text-brand-300">404</p>
      <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">Page not found</p>
      <p className="text-sm text-stone-500">The page you are looking for does not exist.</p>
      <Link to="/" className="btn-primary mt-4">Go home</Link>
    </div>
  );
}
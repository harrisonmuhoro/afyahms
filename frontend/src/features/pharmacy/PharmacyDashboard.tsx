import { Link } from 'react-router-dom';

export function PharmacyDashboard(): JSX.Element {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Pharmacy Dashboard
        </h1>
        <p className="text-sm text-stone-500">Manage prescriptions and medication inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/pharmacy/prescriptions" className="p-6 border rounded shadow-sm bg-white hover:bg-stone-50 transition-colors">
          <h2 className="text-lg font-medium text-stone-800">Prescriptions</h2>
          <p className="text-sm text-stone-500 mt-1">View pending orders and dispense medications.</p>
        </Link>
        <Link to="/pharmacy/medications" className="p-6 border rounded shadow-sm bg-white hover:bg-stone-50 transition-colors">
          <h2 className="text-lg font-medium text-stone-800">Inventory</h2>
          <p className="text-sm text-stone-500 mt-1">Manage stock levels, pricing, and catalog.</p>
        </Link>
      </div>
    </div>
  );
}

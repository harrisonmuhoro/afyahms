import { useState } from 'react';
import { useMedications } from './api';
import type { Medication } from './types';

export function MedicationsPage(): JSX.Element {
  const { data: medications, isLoading, error } = useMedications();
  const [search, setSearch] = useState('');

  const filteredMedications = medications.filter((med: Medication) => 
    med.name.toLowerCase().includes(search.toLowerCase()) || 
    med.generic_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Medication Inventory
          </h1>
          <p className="text-xs text-stone-500">Manage pharmacy stock and drug catalog</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medications..."
            className="input w-full p-2 border rounded"
          />
        </div>
      </div>

      {error !== null && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          Failed to load medications.
        </div>
      )}

      <div className="card overflow-hidden bg-white shadow rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Generic</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Stock</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Price</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-stone-500">Loading...</td>
                </tr>
              ) : filteredMedications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-500">No medications found.</td>
                </tr>
              ) : (
                filteredMedications.map((med: Medication) => (
                  <tr key={med.id}>
                    <td className="px-4 py-3 font-medium text-stone-800">{med.name}</td>
                    <td className="px-4 py-3 text-stone-500">{med.generic_name || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{med.stock_quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${med.unit_price}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${med.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {med.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

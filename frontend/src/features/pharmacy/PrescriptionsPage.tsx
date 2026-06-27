import { usePrescriptions, useUpdatePrescriptionStatus } from './api';
import type { Prescription, PrescriptionItem } from './types';

export function PrescriptionsPage(): JSX.Element {
  const { data: prescriptions, isLoading, error } = usePrescriptions();
  const updateStatus = useUpdatePrescriptionStatus();

  const handleDispense = (id: number) => {
    updateStatus.mutate({ id, status: 'dispensed' });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Prescriptions
        </h1>
        <p className="text-xs text-stone-500">View and dispense patient prescriptions</p>
      </div>

      {error !== null && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          Failed to load prescriptions.
        </div>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-stone-500">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="text-stone-500">No prescriptions found.</div>
        ) : (
          prescriptions.map((prescription: Prescription) => (
            <div key={prescription.id} className="p-4 border rounded bg-white shadow-sm flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg text-stone-800">Prescription #{prescription.id}</h3>
                <p className="text-sm text-stone-600">Doctor ID: {prescription.doctor_id}</p>
                <div className="mt-2 space-y-1">
                  {prescription.items?.map((item: PrescriptionItem) => (
                    <div key={item.id} className="text-sm text-stone-700">
                      • {item.medication?.name || `Med #${item.medication_id}`} - Qty: {item.quantity} ({item.dosage_instructions})
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded text-xs uppercase font-medium ${
                  prescription.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {prescription.status}
                </span>
                
                {prescription.status === 'pending' && (
                  <button 
                    onClick={() => handleDispense(prescription.id)}
                    disabled={updateStatus.isPending}
                    className="mt-2 px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {updateStatus.isPending ? 'Processing...' : 'Mark Dispensed'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

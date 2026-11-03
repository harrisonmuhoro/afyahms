import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { usePortalPrescriptions, usePortalDocuments, type PortalPrescription, type PortalDocument } from './api';

const STATUS_CONFIG: Record<string, { label: string, classes: string }> = {
  active:    { label: 'Active',    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  completed: { label: 'Completed', classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
  stopped:   { label: 'Stopped',   classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export function PortalRecords(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'documents'>('prescriptions');

  const { data: rxData, isLoading: rxLoading } = usePortalPrescriptions();
  const { data: docData, isLoading: docLoading } = usePortalDocuments();

  const prescriptions: PortalPrescription[] = (rxData as any)?.data ?? [];
  const documents: PortalDocument[] = (docData as any)?.data ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Records</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">Your prescriptions and clinical documents in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {(['prescriptions', 'documents'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}>
            {tab === 'prescriptions' ? 'Prescriptions' : 'Clinical Documents'}
          </button>
        ))}
      </div>

      {/* Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {rxLoading && <p className="animate-pulse py-8 text-center text-sm text-stone-400">Loading prescriptions…</p>}
          {!rxLoading && prescriptions.length === 0 && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
              <Icon name="pharmacy" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No prescriptions found.</p>
            </div>
          )}
          {prescriptions.map((rx) => {
            const cfg = STATUS_CONFIG[rx.status] ?? STATUS_CONFIG.completed;
            const dateStr = new Date(rx.created_at).toLocaleDateString('en-GB');
            return (
              <div key={rx.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                      <Icon name="pharmacy" size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">Prescription {rx.id}</p>
                      <p className="text-sm text-stone-500">
                        Dr. {rx.doctor?.first_name} {rx.doctor?.last_name} · {dateStr}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>{cfg.label}</span>
                </div>
                {rx.items && rx.items.length > 0 && (
                  <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50 space-y-2">
                    {rx.items.map(item => (
                      <div key={item.id} className="text-sm text-stone-700 dark:text-stone-300">
                        <strong>{item.medication_name}</strong> - {item.dosage} ({item.frequency} for {item.duration})
                        {item.instructions && <div className="text-xs text-stone-500 mt-0.5">{item.instructions}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {rx.notes && <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{rx.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Clinical Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {docLoading && <p className="animate-pulse py-8 text-center text-sm text-stone-400">Loading documents…</p>}
          {!docLoading && documents.length === 0 && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
              <Icon name="clinical" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No clinical records found.</p>
            </div>
          )}
          {documents.map((doc) => {
            const dateStr = new Date(doc.visit_date).toLocaleDateString('en-GB');
            const summary = doc.soap_note?.assessment ?? doc.chief_complaint ?? 'Visit Record';
            return (
              <div key={doc.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <Icon name="clinical" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">
                      {doc.encounter_type} Encounter ({doc.department})
                    </p>
                    <p className="text-sm text-stone-500">
                      {dateStr} {doc.provider ? `· Dr. ${doc.provider.last_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                  <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

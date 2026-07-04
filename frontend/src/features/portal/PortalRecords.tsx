import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToastBanner } from './PortalModal';

interface Prescription {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'stopped';
  refillsLeft?: number;
}

interface ClinicalRecord {
  id: string;
  type: string;
  date: string;
  provider: string;
  summary: string;
}

const PRESCRIPTIONS: Prescription[] = [];

const CLINICAL_RECORDS: ClinicalRecord[] = [];

const STATUS_CONFIG = {
  active: { label: 'Active', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  completed: { label: 'Completed', classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
  stopped: { label: 'Stopped', classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export function PortalRecords(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'documents'>('prescriptions');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = (id: string, name: string, content: string): void => {
    setDownloading(id);
    setTimeout(() => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_${id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloading(null);
      showToast(`"${name}" downloaded successfully.`);
    }, 1000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast.msg} type={toast.type} />}

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
          {PRESCRIPTIONS.map((rx) => {
            const cfg = STATUS_CONFIG[rx.status];
            return (
              <div key={rx.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                      <Icon name="pharmacy" size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">{rx.name}</p>
                      <p className="text-sm text-stone-500">{rx.dosage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(
                        rx.id, 
                        rx.name, 
                        `Prescription: ${rx.name}\nDosage: ${rx.dosage}\nInstructions: ${rx.instructions}\nPrescribed by: ${rx.prescribedBy}\nStarted: ${rx.startDate}\nStatus: ${rx.status}`
                      )}
                      disabled={downloading === rx.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      {downloading === rx.id ? '...' : <><Icon name="download" size={14} /> Download</>}
                    </button>
                    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                  <p className="text-sm text-stone-700 dark:text-stone-300">{rx.instructions}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <span>Prescribed by <span className="font-medium text-stone-700 dark:text-stone-300">{rx.prescribedBy}</span></span>
                  <span>Started {rx.startDate}</span>
                  {rx.endDate && <span>Ends {rx.endDate}</span>}
                  {rx.status === 'active' && rx.refillsLeft !== undefined && (
                    <span className="font-medium text-teal-600 dark:text-teal-400">
                      {rx.refillsLeft} refill{rx.refillsLeft !== 1 ? 's' : ''} remaining
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clinical Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {CLINICAL_RECORDS.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <Icon name="clinical" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{doc.type}</p>
                    <p className="text-sm text-stone-500">{doc.date} &middot; {doc.provider}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(
                    doc.id, 
                    doc.type, 
                    `Document: ${doc.type}\nDate: ${doc.date}\nProvider: ${doc.provider}\n\nSummary:\n${doc.summary}`
                  )}
                  disabled={downloading === doc.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {downloading === doc.id ? (
                    <>
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Downloading…
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={14} />
                      Download
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{doc.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

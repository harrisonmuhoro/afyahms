import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

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

const PRESCRIPTIONS: Prescription[] = [
  {
    id: 'RX-001',
    name: 'Amoxicillin 500mg',
    dosage: '1 capsule',
    instructions: '3 times a day for 7 days. Take with food.',
    prescribedBy: 'Dr. Mwangi',
    startDate: '20 Jun 2026',
    endDate: '27 Jun 2026',
    status: 'active',
    refillsLeft: 0,
  },
  {
    id: 'RX-002',
    name: 'Atorvastatin 20mg',
    dosage: '1 tablet',
    instructions: 'Once daily at bedtime. Avoid grapefruit.',
    prescribedBy: 'Dr. Mwangi',
    startDate: '12 Jun 2026',
    status: 'active',
    refillsLeft: 2,
  },
  {
    id: 'RX-003',
    name: 'Metformin 500mg',
    dosage: '1 tablet',
    instructions: 'Twice daily with meals.',
    prescribedBy: 'Dr. Achieng',
    startDate: '28 May 2026',
    status: 'active',
    refillsLeft: 1,
  },
  {
    id: 'RX-004',
    name: 'Ibuprofen 400mg',
    dosage: '1 tablet',
    instructions: 'As needed for pain. Max 3 times per day.',
    prescribedBy: 'Dr. Otieno',
    startDate: '01 Apr 2026',
    endDate: '10 Apr 2026',
    status: 'completed',
  },
];

const CLINICAL_RECORDS: ClinicalRecord[] = [
  {
    id: 'DOC-001',
    type: 'Consultation Note',
    date: '12 Jun 2026',
    provider: 'Dr. Mwangi',
    summary:
      'Follow-up visit for hypertension management. Blood pressure readings stable. Continued current medication regimen.',
  },
  {
    id: 'DOC-002',
    type: 'Referral Letter',
    date: '10 May 2026',
    provider: 'Dr. Otieno',
    summary:
      'Referred to Cardiology for further evaluation of palpitations. Patient reports occasional chest tightness on exertion.',
  },
  {
    id: 'DOC-003',
    type: 'Discharge Summary',
    date: '15 Mar 2026',
    provider: 'Dr. Achieng',
    summary:
      'Admitted for 48-hour observation. Discharged in stable condition. Follow-up in 4 weeks.',
  },
];

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  },
  stopped: {
    label: 'Stopped',
    classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function PortalRecords(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'documents'>('prescriptions');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
          Records
        </h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Your prescriptions and clinical documents in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {(['prescriptions', 'documents'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
            }`}
          >
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
              <div
                key={rx.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
              >
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
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>
                    {cfg.label}
                  </span>
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
            <div
              key={doc.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
            >
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
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <Icon name="download" size={14} />
                  Download
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

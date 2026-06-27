import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

interface Result {
  id: string;
  type: 'lab' | 'radiology';
  name: string;
  orderedBy: string;
  date: string;
  status: 'pending' | 'available';
  turnaroundEstimate?: string;
  items?: ResultItem[];
  reportSummary?: string;
}

interface ResultItem {
  name: string;
  value: string;
  unit: string;
  reference: string;
  flag?: 'high' | 'low';
}

const RESULTS: Result[] = [
  {
    id: 'RES-001',
    type: 'lab',
    name: 'Complete Blood Count (CBC)',
    orderedBy: 'Dr. Mwangi',
    date: '22 Jun 2026',
    status: 'available',
    items: [
      { name: 'Haemoglobin', value: '13.2', unit: 'g/dL', reference: '12.0 – 17.5' },
      { name: 'White Blood Cells', value: '11.8', unit: '×10⁹/L', reference: '4.0 – 11.0', flag: 'high' },
      { name: 'Platelets', value: '245', unit: '×10⁹/L', reference: '150 – 400' },
      { name: 'Red Blood Cells', value: '4.6', unit: '×10¹²/L', reference: '4.2 – 5.9' },
    ],
  },
  {
    id: 'RES-002',
    type: 'lab',
    name: 'Lipid Panel',
    orderedBy: 'Dr. Mwangi',
    date: '22 Jun 2026',
    status: 'available',
    items: [
      { name: 'Total Cholesterol', value: '218', unit: 'mg/dL', reference: '< 200', flag: 'high' },
      { name: 'LDL Cholesterol', value: '142', unit: 'mg/dL', reference: '< 130', flag: 'high' },
      { name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', reference: '> 40' },
      { name: 'Triglycerides', value: '155', unit: 'mg/dL', reference: '< 150', flag: 'high' },
    ],
  },
  {
    id: 'RES-003',
    type: 'radiology',
    name: 'Chest X-Ray (AP/Lateral)',
    orderedBy: 'Dr. Otieno',
    date: '10 Jun 2026',
    status: 'available',
    reportSummary: 'Heart size is within normal limits. Lungs are clear with no consolidation, effusion, or pneumothorax identified. No acute cardiopulmonary abnormality.',
  },
  {
    id: 'RES-004',
    type: 'lab',
    name: 'HbA1c (Glycated Haemoglobin)',
    orderedBy: 'Dr. Achieng',
    date: '25 Jun 2026',
    status: 'pending',
    turnaroundEstimate: 'Expected by 27 Jun 2026',
  },
  {
    id: 'RES-005',
    type: 'radiology',
    name: 'Echocardiogram',
    orderedBy: 'Dr. Mwangi',
    date: '24 Jun 2026',
    status: 'pending',
    turnaroundEstimate: 'Expected by 28 Jun 2026',
  },
];

export function PortalResults(): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const available = RESULTS.filter((r) => r.status === 'available');
  const pending = RESULTS.filter((r) => r.status === 'pending');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Results</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Lab and radiology results from your recent visits.
        </p>
      </div>

      {/* Pending Results */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${result.type === 'lab' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                  <Icon name={result.type === 'lab' ? 'laboratory' : 'radiology'} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 dark:text-stone-100">{result.name}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Ordered by {result.orderedBy} &middot; {result.date}
                  </p>
                  {result.turnaroundEstimate && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {result.turnaroundEstimate}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Processing
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Results */}
      {available.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Available ({available.length})
          </h2>
          <div className="space-y-3">
            {available.map((result) => {
              const isExpanded = expandedId === result.id;
              return (
                <div
                  key={result.id}
                  className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : result.id)}
                    className="flex w-full items-center gap-4 p-5 text-left"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${result.type === 'lab' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                      <Icon name={result.type === 'lab' ? 'laboratory' : 'radiology'} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100">{result.name}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        Ordered by {result.orderedBy} &middot; {result.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 sm:inline-flex">
                        Ready
                      </span>
                      <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={18} className="text-stone-400" />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-100 p-5 dark:border-stone-800">
                      {/* Lab items */}
                      {result.items && (
                        <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-stone-50 dark:bg-stone-800">
                                <th className="p-3 text-left text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Test</th>
                                <th className="p-3 text-right text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Result</th>
                                <th className="p-3 text-right text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 hidden sm:table-cell">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.items.map((item, i) => (
                                <tr key={i} className="border-t border-stone-100 dark:border-stone-800">
                                  <td className="p-3 font-medium text-stone-700 dark:text-stone-300">{item.name}</td>
                                  <td className={`p-3 text-right font-bold ${item.flag === 'high' ? 'text-red-600 dark:text-red-400' : item.flag === 'low' ? 'text-blue-600 dark:text-blue-400' : 'text-stone-900 dark:text-stone-100'}`}>
                                    {item.value} {item.unit}
                                    {item.flag && <span className="ml-1 text-xs">({item.flag === 'high' ? 'H' : 'L'})</span>}
                                  </td>
                                  <td className="p-3 text-right text-stone-400 hidden sm:table-cell">{item.reference}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Radiology report */}
                      {result.reportSummary && (
                        <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Report Summary</p>
                          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{result.reportSummary}</p>
                        </div>
                      )}

                      <button type="button" className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">
                        <Icon name="download" size={15} />
                        Download full report
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

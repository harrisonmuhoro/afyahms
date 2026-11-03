import { useState, useEffect, useRef } from 'react';
import { usePatientSearch } from '@/features/patients/api';
import { Glyph } from '@/components/icons/Glyph';

interface PatientHit {
  id: string;
  full_name: string;
  patient_number: string;
  phone?: string | null;
  date_of_birth?: string | null;
}

interface PatientSearchProps {
  value: PatientHit | null;
  onChange: (patient: PatientHit) => void;
  label?: string;
  required?: boolean;
}

export function PatientSearch({
  value,
  onChange,
  label = 'Patient',
  required = false,
}: PatientSearchProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { hits, isLoading } = usePatientSearch(query, 10);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (patient: PatientHit) => {
    onChange(patient);
    setQuery('');
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    if (e.target.value === '' && value) {
      // Clear selection if user wipes the input after selecting
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label htmlFor="patient-search-input" className="text-xs font-medium text-on-surface-variant">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Selected pill */}
      {value && query === '' ? (
        <div className="input flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-on-surface">{value.full_name}</span>
            <span className="font-mono text-[11px] text-on-surface-variant">{value.patient_number}</span>
          </div>
          <button
            type="button"
            onClick={() => { setQuery(''); }}
            aria-label="Clear patient selection"
            className="shrink-0 rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container"
          >
            <Glyph name="close" size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Glyph name="search" size={16} className="text-on-surface-variant" />
          </span>
          <input
            id="patient-search-input"
            type="text"
            autoComplete="off"
            placeholder="Search by name, ID or phone…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="input pl-9"
            required={required && !value}
          />
          {isLoading && (
            <span className="absolute inset-y-0 right-3 flex items-center">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </span>
          )}
        </div>
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-outline-variant bg-surface shadow-xl dark:bg-stone-900">
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {hits.length === 0 && !isLoading && (
              <li className="px-4 py-3 text-sm text-on-surface-variant text-center">
                No patients found for "{query}"
              </li>
            )}
            {hits.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === patient.id}
                  onClick={() => handleSelect(patient as PatientHit)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-container"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-semibold text-primary">
                    {(patient as any).full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-on-surface truncate">{(patient as any).full_name}</p>
                    <p className="font-mono text-[11px] text-on-surface-variant">
                      {(patient as any).patient_number}
                      {(patient as any).phone && (
                        <> · {(patient as any).phone}</>
                      )}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

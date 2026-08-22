import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';

interface Doctor {
  id: string;
  name: string;
  specialization?: string | null;
}

interface DoctorSelectorProps {
  branchId: string;
  value: string;
  onChange: (doctorId: string, doctor: Doctor) => void;
  label?: string;
  required?: boolean;
}

function useDoctors(branchId: string) {
  return useQuery({
    queryKey: ['doctors', 'branch', branchId],
    queryFn: async () => {
      const res = await httpClient.get<{ data: Doctor[] }>('/v1/users', {
        params: { role: 'doctor', branch_id: branchId, per_page: '200' },
      });
      return res.data;
    },
    enabled: !!branchId,
    staleTime: 5 * 60_000,
  });
}

export function DoctorSelector({
  branchId,
  value,
  onChange,
  label = 'Doctor',
  required = false,
}: DoctorSelectorProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: doctors = [], isLoading } = useDoctors(branchId);

  const selected = doctors.find((d) => d.id === value);

  const filtered = search.trim()
    ? doctors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : doctors;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (doctor: Doctor) => {
    onChange(doctor.id, doctor);
    setSearch('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-on-surface-variant">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Trigger */}
      <button
        id="doctor-selector-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-on-surface' : 'text-on-surface-variant/60'}>
          {selected ? selected.name : isLoading ? 'Loading doctors…' : 'Select a doctor'}
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-outline-variant bg-surface shadow-xl dark:bg-stone-900">
          {/* Search */}
          <div className="border-b border-outline-variant/40 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
              <input
                autoFocus
                type="text"
                placeholder="Search doctors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>

          {/* List */}
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-on-surface-variant text-center">No doctors found</li>
            )}
            {filtered.map((doctor) => (
              <li key={doctor.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={doctor.id === value}
                  onClick={() => handleSelect(doctor)}
                  className={[
                    'flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container',
                    doctor.id === value ? 'bg-primary-container/30 font-medium text-primary' : 'text-on-surface',
                  ].join(' ')}
                >
                  <span>{doctor.name}</span>
                  {doctor.specialization && (
                    <span className="text-xs text-on-surface-variant capitalize">
                      {doctor.specialization}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

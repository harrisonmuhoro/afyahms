const APPOINTMENT_TYPES = [
  { value: 'new_patient',       label: 'New Patient',        icon: 'person_add' },
  { value: 'follow_up',         label: 'Follow-up',          icon: 'autorenew' },
  { value: 'procedure',         label: 'Procedure',          icon: 'healing' },
  { value: 'anc',               label: 'Antenatal (ANC)',    icon: 'pregnant_woman' },
  { value: 'immunization',      label: 'Immunization',       icon: 'vaccines' },
  { value: 'lab_radiology',     label: 'Lab / Radiology',    icon: 'biotech' },
  { value: 'specialist_referral', label: 'Specialist Referral', icon: 'transfer_within_a_station' },
] as const;

export type AppointmentTypeValue = (typeof APPOINTMENT_TYPES)[number]['value'];

interface AppointmentTypeSelectProps {
  value: AppointmentTypeValue | '';
  onChange: (value: AppointmentTypeValue) => void;
  label?: string;
  required?: boolean;
}

export function AppointmentTypeSelect({
  value,
  onChange,
  label = 'Appointment Type',
  required = false,
}: AppointmentTypeSelectProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="appointment-type-select" className="text-xs font-medium text-on-surface-variant">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        id="appointment-type-select"
        value={value}
        onChange={(e) => onChange(e.target.value as AppointmentTypeValue)}
        className="input"
        required={required}
      >
        <option value="" disabled>Select appointment type…</option>
        {APPOINTMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}

export { APPOINTMENT_TYPES };

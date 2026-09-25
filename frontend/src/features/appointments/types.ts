export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export interface DoctorSchedule {
  id: string;
  name: string;
  doctor_id: string;
  branch_id: string;
  slot_duration: number;
  max_concurrent: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  time_blocks?: TimeBlock[];
  overrides?: ScheduleOverride[];
  doctor?: { id: string; name: string };
  branch?: { id: string; name: string };
}

export interface ScheduleOverride {
  id: string;
  override_date: string;
  type: 'unavailable' | 'extra';
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface BranchPublicHoliday {
  id: number | string;
  branch_id: number | string;
  holiday_date: string;
  name: string;
  is_active: boolean;
}

export interface TimeBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  status: 'available' | 'full';
}

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  doctor_id: string | null;
  branch_id: string;
  schedule_id: string | null;
  type: string;
  status: AppointmentStatus;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  chief_complaint: string | null;
  notes: string | null;
  booked_via: 'staff' | 'patient_portal' | 'walk_in';
  
  patient?: any; // Would import Patient type here
  doctor?: any; // Would import User type here
  branch?: any; // Would import Branch type here
  schedule?: DoctorSchedule;
}

export interface BookAppointmentPayload {
  patient_id: string;
  doctor_id?: string;
  branch_id: string;
  schedule_id: string;
  type: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  chief_complaint?: string;
  notes?: string;
  booked_via?: 'staff' | 'patient_portal' | 'walk_in';
}

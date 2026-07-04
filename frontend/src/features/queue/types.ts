export type StationCode = 'REC' | 'TRI' | 'DOC' | 'LAB' | 'RAD' | 'PHA' | 'BIL';

export type TicketState =
  | 'issued'
  | 'waiting'
  | 'called'
  | 'in_service'
  | 'held'
  | 'completed'
  | 'no_show'
  | 'transferred'
  | 'cancelled';

export type TicketPriority = 'normal' | 'priority' | 'emergency';

export type MtsCategory = 'red' | 'orange' | 'yellow' | 'green' | 'blue';

export interface QueueStation {
  id: number;
  branch_id: number;
  code: StationCode;
  name: string;
  station_type:
    | 'reception'
    | 'triage'
    | 'doctor'
    | 'laboratory'
    | 'pharmacy'
    | 'billing'
    | 'radiology';
  pipeline_order: number;
  is_active: boolean;
  status: 'open' | 'serving' | 'paused' | 'closed';
}

export interface QueueTicket {
  id: number;
  public_id: string;
  branch_id: number;
  visit_id: number;
  station_id: number;
  station_code: StationCode;
  station_name: string;
  patient_id: number;
  patient_name: string | null;
  patient_number: string | null;
  ticket_number: string;
  sequence_value: number;
  ticket_date: string;
  priority: TicketPriority;
  mts_category: MtsCategory | null;
  state: TicketState;
  served_by: number | null;
  called_at: string | null;
  served_at: string | null;
  completed_at: string | null;
}

export interface Visit {
  id: number;
  public_id: string;
  branch_id: number;
  patient_id: number;
  patient_name: string | null;
  patient_number: string | null;
  visit_number: string | null;
  visit_date: string;
  visit_type: 'walk_in' | 'appointment' | 'referral' | 'follow_up' | 'emergency';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  current_department: StationCode | null;
  registered_at: string | null;
  closed_at: string | null;
  tickets: QueueTicket[];
}

export interface BoardSnapshot {
  station: {
    id: number;
    code: StationCode;
    name: string;
    station_type: QueueStation['station_type'];
    pipeline_order: number;
    is_active: boolean;
    status: QueueStation['status'];
  };
  waiting: QueueTicket[];
  in_service: QueueTicket | null;
}

export interface PublicBoard {
  station: { code: StationCode; name: string };
  now_serving: string | null;
  waiting: Array<{ ticket_number: string; mts_category: MtsCategory | null }>;
}

export interface TriageVitals {
  temperature_c: number | string | null;
  pulse_bpm: number | null;
  respiratory_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2_pct: number | null;
  weight_kg: number | string | null;
  height_cm: number | string | null;
  bmi: number | string | null;
  pain_score: number | null;
}

export interface TriageAssessment {
  id: number;
  public_id: string;
  patient_id: number;
  visit_id: number;
  queue_ticket_id: number | null;
  mts_level: MtsCategory;
  chief_complaint: string | null;
  vitals: TriageVitals;
  notes: string | null;
  assessed_by: number;
  assessed_at: string;
}

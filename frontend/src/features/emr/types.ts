export type EncounterType = 'outpatient' | 'inpatient' | 'emergency' | 'teleconsult' | 'procedure';

export type EncounterStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type Disposition = 'discharged' | 'admitted' | 'referred' | 'deceased' | 'followup' | 'none';

export type DiagnosisType = 'primary' | 'secondary' | 'provisional' | 'differential';

export type Certainty = 'confirmed' | 'suspected' | 'ruled_out';

export interface SoapNote {
  id: number;
  encounter_id: number;
  patient_id: number;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  authored_by: number | null;
  is_signed: boolean;
  is_amended: boolean;
  signed_at: string | null;
  acknowledged_by: number | null;
  acknowledged_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Diagnosis {
  id: number;
  encounter_id: number;
  patient_id: number;
  icd10_code: string;
  description: string | null;
  diagnosis_type: DiagnosisType;
  certainty: Certainty;
  onset_date: string | null;
  diagnosed_by: number | null;
  created_at: string | null;
}

export interface Encounter {
  id: number;
  public_id: string;
  patient_id: number;
  visit_id: number | null;
  provider_id: number | null;
  encounter_type: EncounterType;
  department: string | null;
  visit_date: string | null;
  status: EncounterStatus;
  disposition: Disposition;
  chief_complaint: string | null;
  closed_at: string | null;
  soap_note: SoapNote | null;
  diagnoses: Diagnosis[];
  created_at: string | null;
}

export interface DiagnosisCatalogEntry {
  id: number;
  code: string;
  description: string;
  category: string | null;
}

export interface SoapInput {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface AddDiagnosisInput {
  catalog_code?: string;
  icd10_code?: string;
  description?: string;
  diagnosis_type?: DiagnosisType;
  certainty?: Certainty;
  onset_date?: string;
}

export type EmarStatus = 'pending' | 'given' | 'refused' | 'omitted';

export interface EmarRecord {
  id: number;
  visit_id: number;
  patient_id: number;
  medication_id: number;
  prescription_id: number | null;
  dose: string;
  route: string;
  frequency: string | null;
  scheduled_time: string;
  administered_time: string | null;
  administered_by: number | null;
  status: EmarStatus;
  notes: string | null;
  medication?: {
    id: number;
    code: string;
    generic_name: string;
    brand_name: string | null;
  };
  administered_by_user?: {
    id: number;
    name: string;
  };
}

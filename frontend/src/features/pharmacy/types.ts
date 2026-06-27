export interface Medication {
  id: number;
  name: string;
  generic_name: string | null;
  description: string | null;
  dosage_form: string | null;
  strength: string | null;
  stock_quantity: number;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: number;
  prescription_id: number;
  medication_id: number;
  quantity: number;
  dosage_instructions: string;
  medication?: Medication;
}

export interface Prescription {
  id: number;
  patient_id: number;
  doctor_id: number;
  notes: string | null;
  status: 'pending' | 'dispensed' | 'cancelled';
  items?: PrescriptionItem[];
  doctor?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

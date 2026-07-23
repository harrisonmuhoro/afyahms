/** Lab order/result types mirroring LaboratoryController::orderData()/resultData(). */

export type LabOrderStatus = 'pending' | 'collected' | 'processing' | 'resulted' | 'cancelled';
export type LabPriority = 'routine' | 'urgent' | 'stat';
export type LabInterpretation = 'normal' | 'abnormal' | 'critical';

export interface LabTestInfo {
  id: number;
  name: string;
  code: string;
  category: string | null;
  turnaround_minutes: number | null;
  price: number | null;
}

export interface LabResult {
  id: number;
  lab_order_id: number;
  findings: string;
  interpretation: LabInterpretation | null;
  reference_range: string | null;
  unit: string | null;
  value: string | null;
  is_critical: boolean;
  notes: string | null;
  verified_at: string | null;
  created_at: string | null;
  reported_by: { id: number; name: string } | null;
  verified_by: { id: number; name: string } | null;
}

export interface LabOrder {
  id: number;
  public_id: string;
  visit_id: number;
  patient_id: number;
  status: LabOrderStatus;
  priority: LabPriority;
  clinical_notes: string | null;
  specimen_type: string | null;
  collected_at: string | null;
  resulted_at: string | null;
  created_at: string | null;
  test: LabTestInfo | null;
  ordered_by: { id: number; name: string } | null;
  result: LabResult | null;
}

export interface RecordResultPayload {
  findings: string;
  interpretation?: LabInterpretation;
  reference_range?: string;
  unit?: string;
  value?: string;
  is_critical?: boolean;
  notes?: string;
}

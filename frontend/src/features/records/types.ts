/** Data-correction request types mirroring DataCorrectionRequestResource. */

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface DataCorrectionRequest {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  requested_by: string | null;
  record_type: string;
  record_id: number | string | null;
  field_name: string;
  requested_value: string;
  reason: string | null;
  status: CorrectionStatus;
  reviewed_by: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

/** Imaging order/report types mirroring RadiologyController::orderData()/reportData(). */

export type ImagingOrderStatus = 'pending' | 'scheduled' | 'acquired' | 'reported' | 'cancelled';
export type ImagingPriority = 'routine' | 'urgent' | 'stat';
export type ImagingReportStatus = 'draft' | 'final' | 'amended';

export interface ImagingStudyInfo {
  id: number;
  name: string;
  code: string;
  modality: string;
  body_part: string | null;
  turnaround_minutes: number | null;
  price: number | null;
  requires_contrast: boolean;
}

export interface ImagingReport {
  id: number;
  imaging_order_id: number;
  technique: string;
  findings: string;
  impression: string;
  recommendations: string | null;
  status: ImagingReportStatus;
  is_critical: boolean;
  critical_notes: string | null;
  finalized_at: string | null;
  verified_at: string | null;
  created_at: string | null;
  reported_by: { id: number; name: string } | null;
  verified_by: { id: number; name: string } | null;
}

export interface ImagingOrder {
  id: number;
  public_id: string;
  visit_id: number;
  patient_id: number;
  status: ImagingOrderStatus;
  priority: ImagingPriority;
  clinical_indication: string | null;
  contrast_used: boolean;
  contrast_agent: string | null;
  notes: string | null;
  scheduled_at: string | null;
  acquired_at: string | null;
  reported_at: string | null;
  created_at: string | null;
  study: ImagingStudyInfo | null;
  ordered_by: { id: number; name: string } | null;
  report: ImagingReport | null;
}

export interface SaveReportPayload {
  technique: string;
  findings: string;
  impression: string;
  recommendations?: string;
  is_critical?: boolean;
  critical_notes?: string;
}

/**
 * Audit log entry — mirrors the `audit_logs` table written by
 * AuditLogService (backend Audit module). Entries are immutable.
 */
export interface AuditEntry {
  id: number;
  event: string;
  subject_type: string | null;
  subject_id: number | string | null;
  causer: { id: number; name: string } | null;
  properties: {
    ip?: string | null;
    ua?: string | null;
    route?: string | null;
    method?: string | null;
    [key: string]: unknown;
  } | null;
  branch_id: number | null;
  created_at: string;
}

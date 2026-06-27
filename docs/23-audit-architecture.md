# 23 — Audit & Activity Logging Architecture

> **Module:** `Audit` (bounded context, see `00-foundation.md` §1).
> **Authority:** Subordinate to `00-foundation.md`. Data models here MUST match the physical
> schema in `11-database-schema.md` §13 and the ERD in `10-database-erd.md` §2.11. Where this
> document proposes columns beyond the current physical tables (e.g. hash-chaining), they are
> marked **(extension)** and require a migration tracked against doc 11 before implementation.
> **Compliance frame:** Kenya **Data Protection Act 2019 (KDPA)**, MOH record-keeping rules,
> **HIPAA** principles applied where practical. **Retention ≥ 10 years**, never hard-deleted.

**Document version:** 1.0 · **Status:** Architecture baseline

---

## 1. Goals & Principles

Auditing in Afya HMS is not a feature bolt-on; it is a cross-cutting compliance control. The
architecture exists to satisfy four primary goals, each mapped to concrete mechanisms below.

| Goal | Definition | How the architecture delivers it |
|---|---|---|
| **Accountability** | Every state-changing or sensitive-read action is attributable to a single authenticated identity (the *causer*/*actor*). | Authenticated `user_id` captured on every event; system/job actors flagged explicitly; no anonymous writes to clinical or financial data. |
| **Compliance (KDPA / HIPAA / MOH)** | Demonstrable, exportable evidence that personal & health data was accessed and modified lawfully, with retention ≥ 10 years. | Two-tier model: model-change history (`activity_log`) + immutable security/PHI trail (`audit_logs`); every patient-record read logged; 10-year partitioned retention. |
| **Forensic traceability** | After an incident, reconstruct *who did what, when, from where, and to what data* — including before/after state. | Captured context (§4): who/what/when/where/how/before-after; correlation by `request_id`; chronological reconstruction across both tiers. |
| **Non-repudiation** | A subject cannot credibly deny an action they performed; logs cannot be silently altered. | Append-only writes, no UPDATE/DELETE path, tamper-evident **hash-chaining** (§5.3), DB-trigger enforcement, segregated write service. |

**Design principles**

1. **Two tiers, one timeline.** Model CRUD goes to Spatie `activity_log`; security & PHI-access
   events go to immutable `audit_logs`. They are queryable together by time + subject.
2. **Log the read, not just the write.** PHI is sensitive on *access*, not only mutation. Every
   patient-record view and export is logged (KDPA accountability principle; HIPAA access logs).
3. **Immutability by construction.** The security tier has no update/delete code path, no
   `updated_at`/`deleted_at`, and is optionally locked by a DB trigger.
4. **Never block the request.** Audit writes are asynchronous (queued) wherever the write is not
   itself the regulated artifact; PHI-access and security events that must be guaranteed are
   written synchronously-then-queued (see §9).
5. **Least privilege over the logs themselves.** Reading audit logs is an admin-only,
   permission-gated action that is *itself audited*.
6. **No PHI leakage into logs.** Audit records reference data by ID and store *changed field
   names* + *diffed values for non-sensitive fields*; encrypted/sensitive column values are
   redacted to a marker (`«redacted»`) — the audit answers "this field changed", not "here is
   the patient's HIV status in plaintext in a second table".

---

## 2. Two-Tier Audit Model

Afya HMS deliberately runs **two** complementary audit stores. They answer different questions
and have different durability, immutability, and retention guarantees.

```
                         ┌────────────────────────────────────────────┐
   Eloquent model        │  TIER 1 — Spatie Activity Log               │
   created/updated/   ──▶ │  table: activity_log                       │
   deleted/restored      │  "What changed in a domain record?"         │
                         │  old/new values, causer, subject, batch     │
                         │  Mutable framework table, soft retention    │
                         └────────────────────────────────────────────┘

   Login / PHI view /     ┌────────────────────────────────────────────┐
   export / dispense /    │  TIER 2 — Immutable Audit Log              │
   permission change / ──▶ │  table: audit_logs                         │
   config change /        │  "Who accessed/triggered a sensitive event?"│
   refund / claim         │  append-only, hash-chained, 10-yr, no del. │
                         └────────────────────────────────────────────┘
```

### 2.1 Tier 1 — Spatie Activity Log (domain model CRUD)

- **Package:** `spatie/laravel-activitylog`, physical table `activity_log` (doc 11 §13).
- **Scope:** automatic change history for domain Eloquent models — *what changed*, *old vs new
  values*, *causer* (the acting user), *subject* (the model instance), and the `event`
  (`created`/`updated`/`deleted`/`restored`).
- **Mechanism:** the `LogsActivity` trait on each auditable model, configured with
  `logOnlyDirty()`, an explicit `logFillable()`/`logOnly([...])` allow-list, and
  `dontLogIfAttributesChangedOnly(['updated_at', 'remember_token', ...])`.
- **Why a package here:** model-change history is high-volume, schema-shaped, and well solved by
  Spatie. It is the "diff history" tab on every entity. It is **not** the compliance trail of
  record — `audit_logs` is.
- **Mutability:** Spatie's table is a normal table. We do not rely on it for non-repudiation; it
  is operational change history. (We still never expose UPDATE/DELETE on it through application
  code, and it is included in 10-year retention/partitioning.)

### 2.2 Tier 2 — Immutable `audit_logs` (security & PHI-access)

- **Scope:** the regulated trail — authentication, authorization, **PHI access (reads + exports)**,
  controlled clinical actions (prescription dispense), money movements (refunds, claims), and
  configuration changes.
- **Guarantees:** append-only, no `updated_at`/`deleted_at`, written exclusively through the
  `AuditLogger` service, tamper-evident via hash-chaining (§5.3), enforced by a MySQL trigger.
- **Why a bespoke table:** these events are not all model mutations (a *read* has no Eloquent
  `updated` event; a failed login has no subject row), they require stronger immutability than a
  framework table, and they carry security context (IP/device/endpoint) that Spatie does not.

### 2.3 Routing rule — which tier does an event go to?

| If the event is… | Tier | Example |
|---|---|---|
| A create/update/delete on a domain Eloquent model, and not in the security catalog | **Tier 1** only | Appointment rescheduled; bed rate edited |
| A security, authentication, or authorization event | **Tier 2** only | Failed login; role granted |
| A **read/view/export of PHI** | **Tier 2** only | Doctor opens patient chart; records officer exports patient list |
| A controlled clinical/financial action with regulatory weight | **Tier 2** (and Tier 1 if it also mutated a model) | Prescription dispensed; refund issued; SHA claim submitted |

> Some actions legitimately land in **both** tiers (e.g. dispensing a prescription updates the
> `dispenses` model → Tier 1, *and* is a controlled event → Tier 2). They are correlated by
> `request_id` so the reviewer sees one logical action across both stores.

---

## 3. What To Audit — Event Catalog

The canonical catalog of Tier-2 events. `event_type` values are dot-namespaced and stable
(treated as an enum-by-convention). `category` groups them for the viewer's filters and reports.
"Captured fields" lists event-specific keys merged into the `metadata` JSON beyond the always-on
context of §4.

| event_type | category | Trigger | Captured fields (in `metadata`, plus §4 context) |
|---|---|---|---|
| `auth.login.success` | Authentication | Successful credential + (if required) MFA verification | `method` (password/sso), `mfa_used`, `session_id` |
| `auth.login.failed` | Authentication | Bad credentials | `email_attempted`, `failure_reason`, `attempt_count` |
| `auth.login.locked` | Authentication | Account locked after threshold | `email_attempted`, `lock_until`, `threshold` |
| `auth.logout` | Authentication | User logout / token revoke | `session_id`, `reason` (manual/idle/forced) |
| `auth.session.expired` | Authentication | Idle-timeout session kill | `session_id`, `idle_seconds` |
| `auth.mfa.challenge` | Authentication | MFA prompt issued | `channel` (totp), `session_id` |
| `auth.mfa.success` | Authentication | MFA verified | `channel` |
| `auth.mfa.failed` | Authentication | Wrong TOTP code | `channel`, `attempt_count` |
| `auth.mfa.enrolled` | Authentication | TOTP secret confirmed | `channel` |
| `auth.mfa.reset` | Authentication | MFA reset by admin | `target_user_id` |
| `auth.password.changed` | Authentication | User-initiated password change | `forced` (bool) |
| `auth.password.reset` | Authentication | Reset via flow / by admin | `initiated_by` (self/admin) |
| `authz.permission.granted` | Authorization | Permission/role assigned to user | `target_user_id`, `roles[]`, `permissions[]` |
| `authz.permission.revoked` | Authorization | Permission/role removed | `target_user_id`, `roles[]`, `permissions[]` |
| `authz.role.modified` | Authorization | Role's permission set changed | `role`, `added[]`, `removed[]` |
| `authz.access.denied` | Authorization | 403 on a guarded action | `endpoint`, `required_permission` |
| `authz.branch.switched` | Authorization | Active branch changed | `from_branch_id`, `to_branch_id` |
| `phi.view` | PHI Access | Patient record / chart / encounter opened | `patient_id`, `section` (demographics/emr/labs/rx), `record_type` |
| `phi.search` | PHI Access | Patient search returning identifiable results | `query_hash`, `result_count` |
| `phi.export` | PHI Access | PHI exported (PDF/CSV/print) | `patient_id`, `format`, `record_type`, `row_count`, `document_id` |
| `phi.document.download` | PHI Access | Signed-URL clinical file fetch | `document_id`, `patient_id`, `category` |
| `phi.print` | PHI Access | Print of a clinical record | `patient_id`, `record_type` |
| `clinical.prescription.dispensed` | Clinical Action | Pharmacy dispenses an Rx | `prescription_id`, `dispense_id`, `items[]`, `controlled` (bool) |
| `clinical.prescription.reversed` | Clinical Action | Dispense reversed | `dispense_id`, `reason` |
| `clinical.result.released` | Clinical Action | Lab/radiology result verified & released | `order_id`, `result_id`, `critical` (bool) |
| `clinical.record.amended` | Clinical Action | EMR amendment after sign-off | `encounter_id`, `field`, `reason` |
| `billing.invoice.voided` | Financial | Invoice voided/cancelled | `invoice_id`, `amount`, `reason` |
| `billing.refund.issued` | Financial | Refund processed | `payment_id`, `invoice_id`, `amount`, `method`, `reason` |
| `billing.payment.recorded` | Financial | Payment captured (cash/M-Pesa) | `payment_id`, `invoice_id`, `amount`, `method` |
| `billing.price.overridden` | Financial | Manual price/discount override | `invoice_item_id`, `original`, `override`, `reason` |
| `insurance.claim.submitted` | Financial | SHA claim sent to insurer | `claim_id`, `patient_id`, `amount`, `claim_number` |
| `insurance.claim.adjusted` | Financial | Claim resubmitted/adjusted | `claim_id`, `delta`, `reason` |
| `config.setting.changed` | Configuration | System/feature setting edited | `key`, `group`, `old`, `new` |
| `config.branch.modified` | Configuration | Branch master data changed | `branch_id`, `changed[]` |
| `config.catalog.changed` | Configuration | Drug/service/price catalog edited | `catalog`, `entity_id`, `changed[]` |
| `data.export.bulk` | Data Export | Bulk/report export touching personal data | `report`, `format`, `row_count`, `filters` |
| `data.import` | Data Export | Bulk import of records | `source`, `row_count`, `entity` |
| `audit.viewed` | Audit Self | Someone read the audit logs | `filters`, `result_count` |
| `audit.exported` | Audit Self | Audit trail exported for a regulator | `format`, `range`, `row_count`, `purpose` |
| `audit.integrity.verified` | Audit Self | Hash-chain verification run | `range`, `result` (ok/broken), `first_bad_id` |

> The catalog is versioned; adding an `event_type` is additive and non-breaking. Removing or
> renaming one requires an ADR because reports and exports key off these strings.

---

## 4. Captured Context — the Six Dimensions

Every Tier-2 record answers **who / what / when / where / how / before→after**. These are
captured automatically by the `AuditLogger` (from the request + auth context) so call sites only
supply the event-specific payload.

| Dimension | Fields | Column / location | Notes |
|---|---|---|---|
| **Who** | acting user, role(s), on-behalf-of | `user_id` (+ `metadata.roles[]`, `metadata.acting_as`) | `user_id` NULL only for pre-auth events (failed login) where `metadata.email_attempted` is set. System jobs flagged `metadata.actor = "system:{job}"`. |
| **What** | event type, subject entity | `event_type`, `auditable_type` + `auditable_id`, `description` | `auditable_*` is the morph to the affected record (e.g. `Patient#42`). |
| **When** | timestamp | `created_at` (**UTC**) | Stored UTC per Foundation §3; rendered `Africa/Nairobi` (UTC+3) in UI. Monotonic ordering via `id` + chain. |
| **Where** | IP, device, branch, geo | `ip_address`, `user_agent`, `branch_id`, `metadata.device_id`, `metadata.location` | `branch_id` = active branch at action time. IPv4/IPv6 (`VARCHAR(45)`). |
| **How** | endpoint, method, request id | `metadata.endpoint`, `metadata.http_method`, `metadata.request_id`, `metadata.route` | `request_id` correlates Tier-1 + Tier-2 rows from one HTTP request. |
| **Before → After** | changed values | `old_values`, `new_values` (JSON) | Only changed fields; sensitive/encrypted columns redacted to `«redacted»`. Reads carry no before/after. |

**Always-on `metadata` keys** (merged by the logger): `request_id`, `endpoint`, `http_method`,
`route`, `roles`, `device_id`, `session_id`, `app_version`. Event-specific keys from §3 are merged
on top.

---

## 5. Data Models & Immutability Strategy

### 5.1 `activity_log` (Tier 1 — Spatie)

Standard package shape (doc 11 §13). Mirrored here for completeness — **doc 11 is authoritative**.

```sql
CREATE TABLE activity_log (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    log_name        VARCHAR(255)    NULL,
    description     TEXT            NOT NULL,
    subject_type    VARCHAR(255)    NULL,        -- morph: affected model
    subject_id      BIGINT UNSIGNED NULL,
    event           VARCHAR(255)    NULL,        -- created/updated/deleted/restored
    causer_type     VARCHAR(255)    NULL,        -- morph: acting user
    causer_id       BIGINT UNSIGNED NULL,
    properties      JSON            NULL,         -- { old: {...}, attributes: {...} }
    batch_uuid      CHAR(36)        NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_actlog_subject (subject_type, subject_id),
    KEY idx_actlog_causer  (causer_type, causer_id),
    KEY idx_actlog_log_name (log_name),
    KEY idx_actlog_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- `properties` holds Spatie's `{ "old": {...}, "attributes": {...} }` diff for `updated` events.
- `batch_uuid` groups changes saved within one `LogBatch` (e.g. a multi-model service transaction).
- Although the package supports `updated_at`, application code never updates rows; entries are
  write-once in practice.

### 5.2 `audit_logs` (Tier 2 — immutable)

Append-only, no `updated_at`/`deleted_at`. Physical shape per doc 11 §13 (authoritative). The
hash-chain columns below are an **(extension)** to that table — they must be added by migration
and reflected back into doc 11 before use.

```sql
CREATE TABLE audit_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,
    user_id         BIGINT UNSIGNED NULL,                 -- NULL only for pre-auth events
    event_type      VARCHAR(80)     NOT NULL,             -- §3 catalog, e.g. 'phi.view'
    auditable_type  VARCHAR(255)    NULL,                 -- morph subject
    auditable_id    BIGINT UNSIGNED NULL,
    description     VARCHAR(512)    NULL,                  -- human summary
    ip_address      VARCHAR(45)     NULL,                  -- IPv4/IPv6
    user_agent      VARCHAR(512)    NULL,
    old_values      JSON            NULL,                  -- changed fields only, sensitive redacted
    new_values      JSON            NULL,
    metadata        JSON            NULL,                  -- §4 always-on keys + event-specific
    -- ── tamper-evidence (extension) ──
    prev_hash       CHAR(64)        NULL,                  -- hash of previous row in chain
    row_hash        CHAR(64)        NOT NULL,              -- SHA-256 over canonical row + prev_hash
    created_at      TIMESTAMP       NULL,                  -- UTC
    PRIMARY KEY (id),
    KEY idx_auditlog_branch    (branch_id),
    KEY idx_auditlog_user      (user_id, created_at),
    KEY idx_auditlog_event     (event_type, created_at),
    KEY idx_auditlog_auditable (auditable_type, auditable_id),
    CONSTRAINT fk_auditlog_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_auditlog_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Note on `ON DELETE SET NULL`:** users are *soft-deleted* (Foundation §3, `deleted_at`) and
> never hard-deleted, so the FK rarely fires; it exists only as a defensive integrity rule.
> Nulling `user_id` does **not** lose attribution — `metadata` retains a denormalized
> `{ "user_snapshot": { "id", "name", "employee_no", "roles" } }` so the actor survives even if
> the user row is purged in some future jurisdictional erasure.

### 5.3 Immutability strategy (defense in depth)

Four independent layers — any one failing does not defeat the others.

1. **No mutation code path.** The Eloquent model `AuditLog` overrides to throw on `update`,
   `delete`, `forceDelete`, and `save`-after-exists. The only writer is `AuditLogger::write()`
   (and its queued job). There is no controller, service, or repository method that updates an
   audit row.
2. **Schema shape.** No `updated_at`, no `deleted_at`. Soft-delete is impossible; the model does
   not use `SoftDeletes`.
3. **Database trigger (extension).** A MySQL trigger rejects any `UPDATE`/`DELETE` even from a
   direct SQL session:

   ```sql
   DELIMITER //
   CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON audit_logs
   FOR EACH ROW SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'audit_logs is append-only: UPDATE forbidden';
   CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs
   FOR EACH ROW SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'audit_logs is append-only: DELETE forbidden';
   DELIMITER ;
   ```

   Partition drops for archival (§7) operate at the partition level (which the trigger does not
   block) and are performed by a dedicated maintenance role only after the partition is exported.

4. **Hash-chaining (tamper-evidence).** Each row stores `row_hash = SHA256(canonical(id,
   branch_id, user_id, event_type, auditable_type, auditable_id, ip_address, old_values,
   new_values, metadata, created_at) || prev_hash)`, where `prev_hash` is the previous row's
   `row_hash` (per chain). A deleted or altered row breaks the chain at verification time (§10).
   The chain is computed inside the same DB transaction that inserts the row, serialized by a
   short `SELECT ... FOR UPDATE` on a per-branch chain head (or a single global head) to keep
   ordering deterministic under concurrency.

> **Chain scoping.** Default is **one chain per `branch_id`** (plus a `branch_id IS NULL` system
> chain) so a busy branch's writes don't serialize behind another's. A periodic **anchor** row
> (`audit.integrity.verified` no-op) ties branch chains to a daily root hash that can be
> externally notarized (printed, emailed to compliance, or written to WORM cold storage).

---

## 6. PHI Access Logging — the Compliance Keystone

KDPA accountability and HIPAA access-log expectations require that **every read of patient health
information is recorded**, not only changes. This is the single most important difference from a
generic app audit log.

**What counts as PHI access (logged as Tier-2 `phi.*`):**

- Opening a patient profile, EMR/encounter, SOAP note, problem list, allergies, vitals.
- Viewing lab results, radiology reports/images, prescriptions, diagnoses.
- Downloading a clinical document via signed URL.
- Exporting/printing any of the above (`phi.export`, `phi.print`, `phi.document.download`).
- Patient searches that return identifiable results (`phi.search`, with `result_count`, not the
  raw PII).

**How it is captured — `LogsPhiAccess` middleware + helper.**

- A route middleware `phi.audit:{record_type}` wraps clinical read endpoints. On a successful
  (`2xx`) response it emits a `phi.view` event with `patient_id`, `section`, `record_type`, and
  full §4 context.
- For data assembled in services (not a 1:1 route), a `PhiAccessRecorder` helper is called
  explicitly (`PhiAccess::viewed($patient, 'labs')`) — used where a single screen aggregates
  several records, so each underlying patient is logged once per request (deduped by
  `request_id` + `patient_id` + `section`).
- **Exports are logged before the file is streamed**, capturing `format`, `row_count`, and the
  generated `document_id`, so an export is provable even if the download is interrupted.

**Volume control without losing the trail.** Read traffic dwarfs writes. To avoid logging the
same chart 50 times as a doctor scrolls:

- **Per-request dedup:** identical `(user, patient, section)` within one `request_id` → one row.
- **Session coalescing window (configurable, default 0 = off):** when enabled, repeat views of
  the same `(user, patient, section)` within N minutes increment a counter in the existing row's
  `metadata.view_count` instead of inserting — *only* applied to `phi.view`, never to
  `phi.export`/`phi.print`/`download`, which are always discrete rows. Default off for strict
  compliance; ops may enable to manage volume with documented sign-off.

> **Break-glass.** Emergency access that bypasses a normal RBAC restriction (e.g. a doctor
> viewing a patient outside their branch in an emergency) is logged with `metadata.break_glass =
> true` and `metadata.justification`, and raises a same-day review flag for the compliance role.

---

## 7. Retention, Archival & Partitioning

Per Foundation §11: **≥ 10-year retention, never hard-delete clinical data.** Audit data inherits
this.

| Aspect | Policy |
|---|---|
| **Retention period** | Minimum **10 years** for `audit_logs` and `activity_log` (aligns with medical-record retention). Authentication/security events kept the same 10 years for forensic parity. |
| **Hard delete** | **Never** for audit data. No application or operator path deletes rows. Aging out = move whole partitions to cold storage, then detach — the data still exists, off the hot path. |
| **Partitioning** | **RANGE partition by year** on `created_at` (`pYYYY` partitions, e.g. `p2026`, `p2027`, …, plus a `pMAX` catch-all). Enables partition-pruned queries and partition-level archival without row deletes. Deferred to ops at volume per doc 11 §14.7 — schema-compatible. |
| **Archival to cold storage** | Partitions older than the **hot window** (default: current year + previous 2 years online) are exported to immutable WORM cold storage (S3/R2 Object Lock per StorageManager abstraction, Foundation §7) as signed, hash-manifested Parquet/JSON. The partition is then `EXCHANGE`/`DROP`-ed from the live table by the maintenance role *after* export verification. |
| **Restore** | Cold partitions are re-importable on demand for a regulator request or investigation into a read-only `audit_archive` table; never re-attached as writable. |
| **Hash-chain continuity** | Each archived partition stores its first/last `row_hash` and the daily anchor roots, so the chain is verifiable across the hot/cold boundary. |

**Partition skeleton (extension):**

```sql
ALTER TABLE audit_logs
  PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION p2028 VALUES LESS THAN (2029),
    PARTITION pMAX  VALUES LESS THAN MAXVALUE
  );
```

> Because partitioning + the append-only trigger interact with `created_at` immutability, the
> partition key (`created_at`) is set once at insert and never updated — consistent with §5.3.

---

## 8. Access to Audit Logs, Viewer UI & Reports

The audit trail is itself sensitive. Reading it is privileged, scoped, and audited.

### 8.1 Access control

- **Permission:** `audit.view` and `audit.export` (Spatie permissions, `module.action` per
  Foundation §5). Granted only to `hospital-admin` and a dedicated compliance role; **no other
  role** sees the audit module.
- **Self-auditing:** every `audit.view` / `audit.export` emits its own Tier-2 event (`audit.viewed`
  / `audit.exported`) — the watchers are watched.
- **Tenancy:** audit access respects `BranchScope`; only `branch.view-all` holders (hospital admin,
  executive) see cross-branch audit data. A branch admin sees only their branch's events.
- **No write/edit/delete:** the viewer is strictly read-only; there is no UI control that mutates
  audit data (consistent with §5.3 immutability).

### 8.2 Audit Log Viewer UI (React SPA, per Foundation §10)

Feature folder `src/features/audit`. Read-only, TanStack Query, route-guarded
`<ProtectedRoute permission="audit.view">`.

- **Unified timeline view** — merges Tier-1 + Tier-2 rows by time, correlated on `request_id`,
  with a tier badge. Each row: timestamp (rendered `Africa/Nairobi`), actor + role, event,
  subject (deep-link to the record where permitted), branch, IP/device, and an expandable
  before→after diff.
- **Filters:** date range, `event_type`/category, actor, role, branch, subject entity
  (`auditable_type` + id), IP, and free-text on `description`. Filters map to the indexed columns
  in §5 (`event_type, created_at`; `user_id, created_at`; `auditable_type, auditable_id`).
- **Subject-centric drill-down:** "Access history for Patient PAT-2026-000042" — every `phi.*`
  and change event for one patient, the canonical KDPA data-subject access report.
- **Actor-centric drill-down:** "Everything user X did" — accountability review.
- **Integrity panel:** shows last hash-chain verification result, broken-link alerts, and a "Run
  verification" action (admin, audited).
- **Export action:** range + filter → signed CSV/JSON/PDF export (emits `audit.exported`,
  see §10). No emojis; centralized icon registry (Foundation §10).

### 8.3 Standard reports

| Report | Purpose | Source |
|---|---|---|
| **Patient access report** | Who accessed patient X's PHI in a period (KDPA subject request, breach inquiry). | `audit_logs` `phi.*` + `activity_log` for X |
| **User activity report** | All actions by a staff member (HR/disciplinary, forensic). | both tiers, by `user_id` |
| **Failed-login / lockout report** | Brute-force & intrusion review. | `audit_logs` `auth.login.failed/locked` + `login_histories` |
| **Permission-change report** | Privilege-escalation review. | `audit_logs` `authz.*` |
| **PHI export/download report** | Data-exfiltration monitoring. | `audit_logs` `phi.export`, `phi.document.download`, `data.export.*` |
| **Controlled-drug dispense report** | Narcotics accountability. | `audit_logs` `clinical.prescription.dispensed` (`controlled = true`) |
| **Refund / void report** | Financial fraud review. | `audit_logs` `billing.refund.issued`, `billing.invoice.voided` |
| **Configuration-change report** | System-tampering review. | `audit_logs` `config.*` |
| **Integrity verification report** | Tamper assurance for auditors. | hash-chain verification (§10) |

---

## 9. Performance

Audit must never degrade clinical workflow latency.

- **Async by default.** Tier-1 (Spatie) and most Tier-2 writes are dispatched to a dedicated
  **Redis queue** (`audit`, Foundation §1) via a queued `RecordAuditLog` job, off the request's
  critical path. The HTTP response returns before the row is persisted.
- **Guaranteed-write events.** Events that are themselves the regulated artifact (PHI export,
  dispense, refund, permission change, break-glass) are written **synchronously inside the same DB
  transaction** as the action they record, so the action and its audit row commit atomically — no
  "action succeeded but log lost" gap. They are *also* mirrored to the async pipeline only for
  derived indexing, never as the source of truth.
- **Hash-chain serialization cost** is bounded by per-branch chains (§5.3) so contention is
  per-branch, not global; the chain-head lock is held for microseconds around a single insert.
- **Indexing** (doc 11 §14): `(event_type, created_at)`, `(user_id, created_at)`,
  `(auditable_type, auditable_id)`, `(branch_id)` cover every viewer filter and report query;
  reads are partition-pruned by year.
- **Partitioning** keeps the hot table small (current + 2 years online) so index B-trees stay
  shallow and `EXPLAIN` avoids full scans even at 10-year scale.
- **Backpressure & durability:** the `audit` queue uses a separate worker pool; if Redis is
  unavailable the guaranteed-write path still commits synchronously to MySQL (it does not depend
  on the queue), so security/PHI events are never lost — only async model-change history is
  deferred.
- **Batching:** Spatie `LogBatch` groups a multi-model service transaction under one `batch_uuid`,
  reducing row count and tying related changes together.
- **Payload hygiene:** `old_values`/`new_values` store only changed fields; large/binary fields
  are referenced by id, not embedded — keeps JSON small and indexes effective.

---

## 10. Integrity Verification & Regulator Export

### 10.1 Verification

- **Command:** `php artisan audit:verify {--from=} {--to=} {--branch=}` recomputes each row's
  `row_hash` from its canonical content + the stored `prev_hash` and confirms it matches, walking
  the chain per branch. Output: `ok` or the first `id` where the chain breaks
  (`audit.integrity.verified` recorded with the result).
- **Schedule:** runs nightly over the previous day's partition and produces the **daily anchor**
  root hash, which is exported to WORM cold storage and emailed to compliance — an external,
  immutable witness that the chain up to that day was intact.
- **Tamper signal:** a deleted row (e.g. via a privileged DB session that bypassed the trigger) or
  any field edit breaks `row_hash` continuity; verification flags the exact `id` and the gap,
  surfaced in the viewer's integrity panel.

### 10.2 Regulator / data-subject export

- **`audit:export`** produces a signed package (CSV + JSON + PDF summary) for a date range / actor
  / patient, including: the rows, their hashes, the relevant anchor roots, and a `manifest.json`
  with a `package_hash` and the verification result at export time.
- The export itself is logged (`audit.exported`) with `purpose`, `range`, `row_count`, and the
  package hash — closing the loop so the act of disclosure is auditable.
- Format suits **KDPA data-subject access requests** (a patient may demand a record of who
  accessed their data) and **regulator/MOH inspections** (prove access control and integrity).

---

## 11. Implementation

> Illustrative, PSR-12 / Foundation conventions. Service layer per Foundation §2; the
> `AuditLogger` is the **only** writer to `audit_logs`.

### 11.1 `AuditLogger` service

```php
<?php

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Models\AuditLog;
use App\Modules\Audit\Jobs\RecordAuditLog;
use App\Modules\Audit\Support\AuditContext;
use Illuminate\Support\Facades\DB;

final class AuditLogger
{
    public function __construct(private readonly AuditContext $ctx) {}

    /** Guaranteed, synchronous, hash-chained write (PHI export, dispense, refund, authz…). */
    public function record(
        string $eventType,
        ?object $auditable = null,
        ?string $description = null,
        array $oldValues = [],
        array $newValues = [],
        array $metadata = [],
    ): AuditLog {
        $payload = $this->buildPayload($eventType, $auditable, $description, $oldValues, $newValues, $metadata);

        return DB::transaction(function () use ($payload) {
            $branchId  = $payload['branch_id'];
            $prevHash  = AuditLog::chainHeadForUpdate($branchId);   // SELECT ... FOR UPDATE on chain head
            $payload['prev_hash'] = $prevHash;
            $payload['row_hash']  = AuditLog::computeHash($payload, $prevHash);

            return AuditLog::insertImmutable($payload);             // throws if model used for update/delete
        });
    }

    /** Best-effort async write for high-volume model-change/PHI-view rows. */
    public function recordAsync(string $eventType, array $args = []): void
    {
        RecordAuditLog::dispatch($this->buildPayload($eventType, ...$args))->onQueue('audit');
    }

    private function buildPayload(
        string $eventType, ?object $auditable, ?string $description,
        array $old, array $new, array $metadata,
    ): array {
        return [
            'branch_id'      => $this->ctx->branchId(),
            'user_id'        => $this->ctx->userId(),
            'event_type'     => $eventType,
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id'   => $auditable?->getKey(),
            'description'    => $description,
            'ip_address'     => $this->ctx->ip(),
            'user_agent'     => $this->ctx->userAgent(),
            'old_values'     => $this->redact($old),
            'new_values'     => $this->redact($new),
            'metadata'       => array_merge($this->ctx->baseMetadata(), $metadata), // request_id, endpoint, roles…
            'created_at'     => now('UTC'),
        ];
    }

    /** Replace values of sensitive/encrypted columns with a marker — never store PHI plaintext in logs. */
    private function redact(array $values): array
    {
        foreach (config('audit.sensitive_fields', []) as $field) {
            if (array_key_exists($field, $values)) {
                $values[$field] = '«redacted»';
            }
        }
        return $values;
    }
}
```

### 11.2 Immutable model

```php
<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class AuditLog extends Model
{
    public $timestamps = false;                 // only created_at, set explicitly; no updated_at
    protected $guarded = [];
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata'   => 'array',
        'created_at' => 'immutable_datetime',
    ];

    // Block every mutation path at the application layer (defense layer #1, §5.3).
    public function save(array $options = []): bool
    {
        if ($this->exists) {
            throw new RuntimeException('audit_logs are immutable: update forbidden.');
        }
        return parent::save($options);
    }
    public function delete(): bool { throw new RuntimeException('audit_logs are immutable: delete forbidden.'); }
    public function forceDelete(): bool { throw new RuntimeException('audit_logs are immutable.'); }

    public static function insertImmutable(array $payload): self
    {
        $log = new self();
        $log->forceFill($payload);
        Model::save($log);                      // bypass the guard for the single allowed insert
        return $log;
    }

    public static function computeHash(array $payload, ?string $prevHash): string
    {
        $canonical = json_encode([
            $payload['branch_id'], $payload['user_id'], $payload['event_type'],
            $payload['auditable_type'], $payload['auditable_id'],
            $payload['ip_address'], $payload['old_values'], $payload['new_values'],
            $payload['metadata'], (string) $payload['created_at'],
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        return hash('sha256', $canonical . ($prevHash ?? ''));
    }
}
```

### 11.3 Spatie observer wiring (Tier 1)

```php
<?php

namespace App\Modules\Patients\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Patient extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['first_name', 'last_name', 'phone', 'branch_id', 'is_active']) // never log encrypted national_id
            ->logOnlyDirty()
            ->dontLogIfAttributesChangedOnly(['updated_at'])
            ->dontSubmitEmptyLogs()
            ->useLogName('patient');
    }
}
```

> Sensitive/encrypted columns (e.g. `national_id`) are deliberately excluded from `logOnly()` so
> they never enter `activity_log.properties` in plaintext — mirroring the §11.1 redaction rule.

### 11.4 PHI-access middleware (Tier 2)

```php
<?php

namespace App\Modules\Audit\Http\Middleware;

use App\Modules\Audit\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;

class LogPhiAccess
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** Usage on clinical read routes:  ->middleware('phi.audit:emr')  */
    public function handle(Request $request, Closure $next, string $recordType = 'record')
    {
        $response = $next($request);

        if ($response->isSuccessful() && $request->route('patient')) {
            $patient = $request->route('patient');
            $this->audit->record(
                eventType: 'phi.view',
                auditable: $patient,
                description: "Viewed {$recordType} for patient {$patient->patient_number}",
                metadata: [
                    'patient_id'  => $patient->id,
                    'section'     => $recordType,
                    'record_type' => $recordType,
                ],
            );
        }

        return $response;
    }
}
```

### 11.5 Authentication-event listeners (Tier 2)

```php
<?php

namespace App\Modules\Audit\Listeners;

use App\Modules\Audit\Services\AuditLogger;
use Illuminate\Auth\Events\{Login, Logout, Failed, Lockout};

class AuthAuditSubscriber
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handleLogin(Login $e): void
    {
        $this->audit->record('auth.login.success', $e->user,
            metadata: ['method' => 'password', 'mfa_used' => (bool) $e->user->mfa_enabled]);
    }

    public function handleFailed(Failed $e): void
    {
        $this->audit->record('auth.login.failed', null, 'Failed login attempt',
            metadata: ['email_attempted' => $e->credentials['email'] ?? null, 'failure_reason' => 'invalid_credentials']);
    }

    public function handleLogout(Logout $e): void
    {
        $this->audit->record('auth.logout', $e->user, metadata: ['reason' => 'manual']);
    }

    public function handleLockout(Lockout $e): void
    {
        $this->audit->record('auth.login.locked', null, 'Account locked (rate limit)',
            metadata: ['email_attempted' => $e->request->input('email')]);
    }

    public function subscribe(): array
    {
        return [
            Login::class   => 'handleLogin',
            Failed::class  => 'handleFailed',
            Logout::class  => 'handleLogout',
            Lockout::class => 'handleLockout',
        ];
    }
}
```

### 11.6 Controlled-action call site (dispense)

```php
// inside DispenseService::dispense(), within the same DB transaction as the dispense write
$this->audit->record(
    eventType: 'clinical.prescription.dispensed',
    auditable: $prescription,
    description: "Dispensed {$prescription->prescription_number}",
    newValues: ['status' => 'dispensed'],
    metadata: [
        'prescription_id' => $prescription->id,
        'dispense_id'     => $dispense->id,
        'items'           => $dispense->items->pluck('drug_catalog_id')->all(),
        'controlled'      => $dispense->hasControlledItems(),
    ],
);
```

---

## 12. Compliance Traceability Matrix

| Requirement | Source | Where satisfied |
|---|---|---|
| Accountability — every access attributable | KDPA 2019 | §1, §4 (who), `user_id` + role snapshot |
| Record of PHI access (reads) | KDPA / HIPAA | §6, `phi.*` catalog, `LogPhiAccess` |
| Data-subject access report | KDPA | §8.3 patient access report, §10.2 export |
| Tamper-evidence / non-repudiation | KDPA security; forensic | §5.3 hash-chain + trigger, §10 verification |
| ≥ 10-year retention, no hard delete | Foundation §11, MOH | §7 partitioning + cold archival |
| Privileged, audited access to logs | least privilege | §8.1 `audit.view`, self-audit |
| Regulator export & integrity proof | MOH / KDPA inspection | §10.2 signed package + manifest |
| Model-change history | operational/forensic | §2.1 `activity_log` |
| Security events (login/MFA/authz) | security baseline (Foundation §11) | §3 catalog, §11.5 listeners |

---

### Cross-references

- `00-foundation.md` §3 (timestamps/UTC, identifiers), §4 (tenancy/`branch_id`), §5 (roles/MFA), §11 (security & compliance).
- `08-rbac-matrix.md` — `audit.view` / `audit.export` permission assignment.
- `10-database-erd.md` §2.11 — `activity_log` / `audit_logs` relationships.
- `11-database-schema.md` §13 (table DDL, authoritative), §14 (indexing & partitioning).
- `13-backend-architecture.md` — service/repository layering the `AuditLogger` plugs into.

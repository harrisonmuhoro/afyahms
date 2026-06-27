# Cross-Document Consistency Audit Report

**Date:** 2026-06-22 · **Scope:** docs 00–27 · **Method:** 3 parallel read-only audits (schema, roles/permissions, identifiers/config).

**Canonical sources of truth (conflict resolution order):**
1. `00-foundation.md` — IDs, roles, abstractions, config names, queue pipeline, conventions.
2. `11-database-schema.md` (DDL) — physical schema. *Where the DDL was found incomplete vs the deeper module designs (17–23), the DDL is EXTENDED to become the complete superset.*
3. `08-rbac-matrix.md` — permission catalog. `09-system-architecture.md` §7.3 — Redis queue topology.

**Result:** Mostly consistent. IDs, money (`DECIMAL(12,2)` KES), abstraction class names, config filenames, providers, timezone (`Africa/Nairobi`), triage bands, the queue pipeline, and the 10 role slugs are all aligned. Drift found in three areas, resolved below.

---

## A. Schema drift — FIX: extend DDL (doc 11) to the complete superset

Module docs 17–23 specified tables/columns the DDL never captured. Added to doc 11:

| # | Add to doc 11 | Source | Sev |
|---|---|---|---|
| A1 | `visits` table (ties a patient's day across the queue pipeline) + `queue_tickets.visit_id` FK | 17 §6.2 | high |
| A2 | `queue_events` table (ticket state-transition ledger) | 17 §6.3 | med |
| A3 | `queue_tickets`: add `sequence_value SMALLINT UNSIGNED`, `mts_category ENUM('red','orange','yellow','green','blue') NULL`; canonical station col `station_id`; widen `ticket_number` | 17 §6.2 | med |
| A4 | `clinical_alerts`, `clinical_alert_items`, `alert_acknowledgements` (+ ensure `alert_rules`) | 18 §5 | high |
| A5 | `pharmacy_stock` rollup table (per branch+drug on-hand/reorder) | 19 §4.3 | high |
| A6 | `stock_transfers`, `stock_transfer_items`, `stock_takes`, `stock_take_items` | 19 §7.4 | high |
| A7 | SHA: `insurer_configs`, `pre_authorizations`, `sha_claim_status_history`, `insurer_service_mappings`, `sha_remittances`, `sha_remittance_lines` | 20 §7 | high |
| A8 | `sha_claims`: extend `status` enum → add `under_review,partially_approved,reconciled,void,pre_auth`; add cols `preauth_id`, `external_claim_id`, `appeal_of_claim_id`, `reconciled_amount`, `reconciled_at`, `raw_response` | 20 §4.1/§7.3 | med |
| A9 | `mpesa_transactions.initiated_by BIGINT UNSIGNED NULL` FK→users | 21 §5.2 | med |
| A10 | `audit_logs`: add `prev_hash CHAR(64) NULL`, `row_hash CHAR(64) NOT NULL` + index (tamper-evident hash chain) | 23 §5.2 | high |
| A11 | ERD (doc 10) label `user_id` → `portal_user_id` on patients (match DDL) | 10 §2.2 | low |

All added tables follow Foundation §3 conventions: `branch_id` where operational, soft deletes, `created_at/updated_at`, FK constraints with explicit ON DELETE, indexes.

---

## B. Permission drift — FIX: rename in API (doc 12) to RBAC names; add genuinely-missing perms to RBAC (doc 08)

Naming convention (Foundation §5): `{module}.{action}`, multi-word actions hyphenated. The API spec had invented dot-nested names. Canonical renames in doc 12:

| API spec (wrong) | Canonical (RBAC) |
|---|---|
| `lab.sample` | `lab.accession` |
| `lab.result.enter` | `lab.enter-result` |
| `lab.result.approve` | `lab.approve-result` |
| `radiology.acquire` | `radiology.upload-image` |
| `billing.view` | `invoices.read` |
| `billing.create` | `invoices.create` |
| `billing.void` | `billing.void-invoice` |
| `billing.payment.create` | `payments.create` |
| `sha.eligibility.check` | `sha.verify-eligibility` *(new)* |
| `sha.preauth.create` | `sha.pre-auth` |
| `sha.claim.create` | `sha.create-claim` |
| `sha.claim.view` | `sha.read` |
| `sha.claim.submit` | `sha.submit-claim` |
| `sha.claim.appeal` | `sha.appeal-claim` *(new)* |
| `inpatient.ward.manage` / `inpatient.bed.manage` | `wards.manage` |
| `inpatient.chart.view` | `inpatient.view-chart` *(new)* |
| `inpatient.chart.create` | `inpatient.create-chart` *(new)* |
| `encounters.diagnose` | `diagnoses.create` |
| `notifications.send` | `communication.send` |
| `pharmacy.stock.view` | `pharmacy.view-stock` *(new)* |
| `pharmacy.stock.adjust` | `pharmacy.manage-stock` |
| `webhooks.replay` | `webhooks.replay` *(new module)* |

**Add to RBAC matrix (doc 08)** with sensible grants: `sha.verify-eligibility` (cashier, receptionist), `sha.appeal-claim` (cashier), `inpatient.view-chart` (doctor, nurse, pharmacist, cashier), `inpatient.create-chart` (nurse), `pharmacy.view-stock` (pharmacist, +read roles), `webhooks.replay` (hospital-admin only).

**Role-title fixes in doc 12:** `phlebotomist` → `lab-technician, nurse`; `radiographer` → `radiologist` (these are job titles, not canonical roles).

**Doc 19 normalize:** `pharmacy-stock.adjust` → `pharmacy.manage-stock`, `pharmacy-stock.view` → `pharmacy.view-stock`.

MFA roles (hospital-admin, doctor, pharmacist) and `branch.view-all` (hospital-admin only) — verified consistent, no change.

---

## C. Queue-name drift — FIX: docs 13 & 25 adopt doc 09 §7.3 canonical queues

Canonical Redis queues, priority high→low: `alerts, notifications, claims, pdf, payments, default, reporting, maintenance`.

| Doc | Was | Fix |
|---|---|---|
| 13 §6.1 | `--queue=clinical,payments,notifications,documents,audit,default` | rename `clinical`→`alerts`, `documents`→`pdf`; add `claims`, `reporting`, `maintenance` |
| 25 §3.3 entrypoint | `--queue=high,default,low` (workers would never drain domain queues — **prod bug**) | `--queue=alerts,notifications,claims,pdf,payments,default,reporting` |

---

## Follow-up safeguard
Add a Pest test asserting the `RolesAndPermissionsSeeder` permission list matches doc 08 exactly, to catch future drift (recommended in doc 24 Definition of Done).

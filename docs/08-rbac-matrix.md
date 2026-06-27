# 08 — RBAC Permissions Matrix

> **Authority:** Subordinate to `00-foundation.md`. Role slugs, module list, MFA roles, and
> branch-scope rule are inherited from the foundation and MUST NOT diverge. If anything here
> contradicts `00-foundation.md`, the foundation wins.
>
> **Implementation:** Spatie Laravel Permission (`spatie/laravel-permission`).
> **Guard:** `web` (Sanctum SPA token). Single guard across the application.
> **Document version:** 1.0 · **Status:** MVP RBAC baseline

---

## 1. Permission naming convention

All permissions follow a strict, lowercase, dot-delimited convention:

```
{module}.{action}
```

- **`{module}`** — a kebab-case bounded-context / resource slug derived from the foundation
  module list (e.g. `patients`, `prescriptions`, `lab`, `billing`, `sha`, `emr`, `branch`).
- **`{action}`** — a verb or verb-noun describing the operation. Five canonical CRUDL actions
  exist for every resource module, plus domain-specific **special actions**.

### Canonical CRUDL actions (apply to most modules)

| Action | Meaning |
|---|---|
| `create` | Create a new record. |
| `read` | View a single record's full detail. |
| `update` | Modify an existing record. |
| `delete` | Soft-delete a record (clinical data is never hard-deleted — see `00-foundation.md §11`). |
| `list` | View the index / paginated collection. |

### Rules

1. Names are **immutable identifiers** — never rename a permission; deprecate and add a new one.
2. Module slug uses the **resource** noun, which may be finer-grained than a bounded context
   (e.g. the `EMR` context exposes `emr.*`, `prescriptions.*`, `vitals.*`, `diagnoses.*`).
3. Special actions are explicit, never implied by CRUD (e.g. holding `prescriptions.update`
   does **not** grant `prescriptions.dispense`).
4. Plurals match the resource collection (`patients`, `appointments`, `claims` → `sha`).
5. Frontend `<ProtectedRoute permission="...">` guards reference these exact strings; Zod/route
   guards mirror the backend permission names 1:1.

---

## 2. Roles (10) — canonical slugs, descriptions & scope

| # | Role | Slug | Description & operational scope | Branch scope |
|---|---|---|---|---|
| 1 | Hospital Admin | `hospital-admin` | Super-administrator. Manages users, roles, branches, system settings, master catalogs, and cross-branch reporting. Full read across clinical data for governance; not a clinical author. | **All branches** |
| 2 | Doctor | `doctor` | Licensed clinician. Authors EMR/SOAP notes, diagnoses, prescriptions, lab/radiology orders; signs records; manages own appointments and inpatient rounds. | Active branch (multi-branch if granted) |
| 3 | Nurse | `nurse` | Records triage, vitals, nursing notes; administers medication (MAR); manages inpatient ward tasks and queue movement. Reads EMR. | Active branch |
| 4 | Receptionist | `receptionist` | Front desk. Registers/searches patients, books appointments, manages reception→triage queue, captures basic demographics. No clinical authoring. | Active branch |
| 5 | Records Officer | `records-officer` | Health Information Management. Manages patient master records, document indexing, medical-record retrieval/export, merges/de-duplication. | Active branch |
| 6 | Pharmacist | `pharmacist` | Dispenses prescriptions, manages pharmacy stock and drug catalog at branch, performs interaction checks, records substitutions. | Active branch |
| 7 | Lab Technician | `lab-technician` | Accessions samples, records lab results, runs/approves results per scope, manages lab catalog and worklists. | Active branch |
| 8 | Radiologist | `radiologist` | Performs/reports radiology studies, uploads images, signs radiology reports, manages modality worklist. | Active branch |
| 9 | Cashier/Accountant | `cashier` | Billing and payments. Creates invoices, takes payments (M-Pesa/cash), issues receipts, processes refunds, reconciles, submits SHA claims. | Active branch |
| 10 | Patient | `patient` | Patient Portal self-service. Views own records, appointments, results (released), invoices; books appointments; messages providers. **Own-data only.** | Own records only |

> **Note on `patient` scope:** The `patient` role is *not* branch-scoped via `BranchScope`;
> it is **subject-scoped** to the authenticated patient's own `patient_id` via a dedicated
> policy/global ownership scope. Patient portal permissions are deliberately narrow and
> read-mostly, gated additionally by per-resource ownership checks.

---

## 3. MFA-required roles

Per `00-foundation.md §5 & §11`, **TOTP MFA is mandatory** for roles that can author clinical
records, dispense medication, or hold administrative privilege:

| Role | MFA required | Rationale |
|---|---|---|
| `hospital-admin` | **Yes** | Full administrative & cross-branch reach. |
| `doctor` | **Yes** | Clinical authoring, prescribing, e-signature. |
| `pharmacist` | **Yes** | Controlled-substance dispensing. |
| `nurse` | Recommended (optional MVP) | Medication administration; enable per hospital policy. |
| `cashier` | Recommended (optional MVP) | Financial operations & refunds. |
| `radiologist`, `lab-technician`, `records-officer`, `receptionist`, `patient` | No (baseline) | Standard auth (password + session/device controls). |

> Enforcement: a `RequireMfa` middleware checks `user->mfa_enabled && mfa_confirmed_at` for any
> route whose authenticated user holds an MFA-required role; unconfirmed users are forced through
> TOTP enrollment before any protected action.

---

## 4. Branch-scope rules

Per `00-foundation.md §4`:

- A global `BranchScope` Eloquent scope auto-filters every operational query by the user's
  **`active_branch_id`** (session/token claim, set via the branch switcher).
- The scope is **bypassable only** by holders of the **`branch.view-all`** permission.
- `branch.view-all` is granted **only** to:

| Role | `branch.view-all` | Notes |
|---|---|---|
| `hospital-admin` | **Yes** | Governance, cross-branch reporting, admin. |
| (Executive reporting, future) | Yes | Read-only reporting role may be added later; not in the 10 MVP roles. |
| All other 9 roles | **No** | Confined to active branch (or own-data for `patient`). |

- Users may belong to multiple branches (home + granted); switching `active_branch_id` re-scopes
  all queries. Without `branch.view-all`, a user can only switch *among branches they belong to*.
- Cross-branch **write** is never permitted by `branch.view-all` alone — it relaxes the read
  filter; writes still require the relevant `{module}.{action}` permission **and** an active
  branch context. Global reference data (drug catalog master, ICD-10, system settings,
  roles/permissions) is not branch-scoped.

---

## 5. Full enumerated permission list (by module)

> Legend: **C**reate · **R**ead · **U**pdate · **D**elete · **L**ist are the CRUDL baseline.
> Special actions are listed explicitly. All permissions live under the `web` guard.

### Auth & Account (`auth`, `users`, `roles`)
- `users.create`, `users.read`, `users.update`, `users.delete`, `users.list`
- `users.assign-role` — assign/revoke roles to a user
- `users.reset-password` — admin-initiated password reset
- `users.impersonate` — support impersonation (admin only, fully audited)
- `roles.create`, `roles.read`, `roles.update`, `roles.delete`, `roles.list`
- `roles.assign-permission` — attach/detach permissions to a role
- `mfa.manage-others` — reset/disable another user's MFA (admin only)

### Tenancy / Branches (`branches`, `branch`)
- `branches.create`, `branches.read`, `branches.update`, `branches.delete`, `branches.list`
- `branch.view-all` — **bypass `BranchScope`** across all branches
- `branch.switch` — change own active branch (among assigned branches)

### Patients (`patients`)
- `patients.create`, `patients.read`, `patients.update`, `patients.delete`, `patients.list`
- `patients.export` — export patient/medical records (PDF/CSV), heavily audited
- `patients.merge` — merge duplicate patient records
- `patients.view-own` — patient views their own record (portal)

### Appointments (`appointments`)
- `appointments.create`, `appointments.read`, `appointments.update`, `appointments.delete`, `appointments.list`
- `appointments.cancel` — cancel an appointment
- `appointments.reschedule` — move an appointment
- `appointments.book-own` — patient self-booking (portal)

### Queue (`queue`)
- `queue.read`, `queue.list`
- `queue.manage` — add/move/advance tickets across stations
- `queue.call-next` — call the next ticket at a station
- `queue.override-priority` — emergency bypass / manual priority change

### Triage (`triage`)
- `triage.create`, `triage.read`, `triage.update`, `triage.list`
- `triage.assign-category` — assign Manchester Triage category (Red/Orange/Yellow/Green/Blue)

### Visits (`visits`)
- `visits.create`, `visits.read`, `visits.update`, `visits.list`
- `visits.close` — close a completed visit chain

### EMR — Clinical record (`emr`, `vitals`, `diagnoses`)
- `emr.create`, `emr.read`, `emr.update`, `emr.delete`, `emr.list`
- `emr.sign` — electronically sign/lock a SOAP note (clinician attestation)
- `emr.amend` — create an addendum to a signed record (signed records are immutable)
- `emr.view-history` — view full clinical history / version trail
- `vitals.create`, `vitals.read`, `vitals.update`, `vitals.list`
- `diagnoses.create`, `diagnoses.read`, `diagnoses.update`, `diagnoses.delete`, `diagnoses.list`

### Clinical Alerts (`alerts`)
- `alerts.read`, `alerts.list`
- `alerts.acknowledge` — acknowledge/clear a clinical alert
- `alerts.configure` — manage alert rules/thresholds

### Pharmacy — Prescriptions & dispensing (`prescriptions`, `pharmacy`)
- `prescriptions.create`, `prescriptions.read`, `prescriptions.update`, `prescriptions.delete`, `prescriptions.list`
- `prescriptions.dispense` — dispense/fill a prescription
- `prescriptions.substitute` — record a therapeutic/generic substitution
- `prescriptions.verify` — pharmacist clinical verification / interaction sign-off
- `pharmacy.read`, `pharmacy.list`
- `pharmacy.view-stock` — view pharmacy stock on-hand, batches & movements (read-only)
- `pharmacy.manage-stock` — adjust pharmacy stock levels
- `pharmacy.manage-catalog` — manage branch drug catalog entries

### Laboratory (`lab`)
- `lab.create`, `lab.read`, `lab.update`, `lab.delete`, `lab.list`
- `lab.order` — place a lab test order (clinician)
- `lab.accession` — accession/receive a sample (assign `LAB-...` ID)
- `lab.enter-result` — enter raw results
- `lab.approve-result` — approve/validate and release a result
- `lab.manage-catalog` — manage test catalog/panels

### Radiology (`radiology`)
- `radiology.create`, `radiology.read`, `radiology.update`, `radiology.delete`, `radiology.list`
- `radiology.order` — place an imaging order (clinician)
- `radiology.upload-image` — upload study images/series
- `radiology.report` — author a radiology report
- `radiology.sign-report` — sign/finalize a radiology report
- `radiology.manage-catalog` — manage modality/study catalog

### Billing & Payments (`billing`, `invoices`, `payments`)
- `invoices.create`, `invoices.read`, `invoices.update`, `invoices.delete`, `invoices.list`
- `payments.create` — record a payment (M-Pesa/cash)
- `payments.read`, `payments.list`
- `billing.refund` — process a refund
- `billing.void-invoice` — void/cancel an invoice
- `billing.apply-discount` — apply a discount/waiver
- `billing.reconcile` — daily reconciliation / cash-up

### Insurance — SHA claims (`sha`)
- `sha.read`, `sha.list`
- `sha.verify-eligibility` — verify SHA member eligibility/benefits before service
- `sha.create-claim` — create a SHA claim
- `sha.submit-claim` — submit a claim to SHA
- `sha.appeal-claim` — appeal a rejected claim
- `sha.pre-auth` — request pre-authorization
- `sha.track-claim` — view claim status/tracking
- `sha.reconcile` — reconcile claim payments/remittances

### Inpatient (`inpatient`, `wards`, `mar`)
- `inpatient.admit` — admit a patient (assign `ADM-...`)
- `inpatient.read`, `inpatient.update`, `inpatient.list`
- `inpatient.transfer` — transfer ward/bed
- `inpatient.discharge` — discharge a patient
- `wards.read`, `wards.list`, `wards.manage` — manage wards/beds
- `inpatient.view-chart` — view nursing chart entries (vitals, intake/output, meds, notes)
- `inpatient.create-chart` — record a nursing chart entry
- `mar.read`, `mar.administer` — medication administration record entry

### Inventory (`inventory`, `purchase-orders`)
- `inventory.create`, `inventory.read`, `inventory.update`, `inventory.delete`, `inventory.list`
- `inventory.adjust-stock` — stock adjustments / write-offs
- `inventory.receive-grn` — receive goods (GRN)
- `purchase-orders.create`, `purchase-orders.read`, `purchase-orders.update`, `purchase-orders.list`
- `purchase-orders.approve` — approve a PO

### Reporting (`reporting`)
- `reporting.read`, `reporting.list`
- `reporting.clinical` — view clinical reports
- `reporting.financial` — view financial reports
- `reporting.operational` — view operational/queue reports
- `reporting.export` — export reports (CSV/PDF/XLSX)

### Communication (`communication`)
- `communication.read`, `communication.list`
- `communication.send` — send SMS/email/notification to patients/staff
- `communication.manage-templates` — manage message templates
- `communication.message-provider` — patient↔provider portal messaging

### Patient Portal (`portal`)
- `portal.access` — base portal access
- `portal.view-results` — view own released results
- `portal.view-invoices` — view own invoices/statements
- `portal.pay` — pay own invoice (M-Pesa)

### Documents / Storage (`documents`)
- `documents.create`, `documents.read`, `documents.update`, `documents.delete`, `documents.list`
- `documents.upload` — upload a document
- `documents.download` — download via signed URL
- `documents.view-own` — patient views own documents (portal)

### Audit (`audit`)
- `audit.read`, `audit.list`
- `audit.export` — export audit logs (admin/compliance)

### Admin / System settings (`settings`, `catalog`)
- `settings.read`, `settings.update` — system settings
- `catalog.manage` — manage global master catalogs (ICD-10, drug master, test master)
- `sequences.read` — view sequence counters (diagnostics)

### Webhooks (`webhooks`)
- `webhooks.replay` — manually replay a stored inbound provider webhook event (admin only)

---

## 6. RBAC matrix — permissions × roles

> ✓ = granted · ✗ = denied. Roles: **HA** Hospital Admin · **DR** Doctor · **NU** Nurse ·
> **RC** Receptionist · **RO** Records Officer · **PH** Pharmacist · **LT** Lab Technician ·
> **RD** Radiologist · **CA** Cashier/Accountant · **PT** Patient.

### Auth & Account

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `users.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.list` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.assign-role` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.reset-password` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `users.impersonate` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.list` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `roles.assign-permission` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `mfa.manage-others` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Tenancy / Branches

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `branches.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `branches.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `branches.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `branches.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `branches.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `branch.view-all` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `branch.switch` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

### Patients

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `patients.create` | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `patients.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `patients.update` | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `patients.delete` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `patients.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `patients.export` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `patients.merge` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `patients.view-own` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Appointments

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `appointments.create` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `appointments.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `appointments.update` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `appointments.delete` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `appointments.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `appointments.cancel` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `appointments.reschedule` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `appointments.book-own` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Queue

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `queue.read` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.list` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.manage` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.call-next` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.override-priority` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Triage

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `triage.create` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `triage.read` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `triage.update` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `triage.list` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `triage.assign-category` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Visits

The visit chain ties a patient to their tickets, encounter, and invoices for one journey.

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `visits.create` | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `visits.read` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `visits.update` | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `visits.list` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `visits.close` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### EMR — Clinical record

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `emr.create` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.read` | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| `emr.update` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.delete` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.list` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.sign` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.amend` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `emr.view-history` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `vitals.create` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `vitals.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `vitals.update` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `vitals.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `diagnoses.create` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `diagnoses.read` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `diagnoses.update` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `diagnoses.delete` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `diagnoses.list` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Clinical Alerts

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `alerts.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `alerts.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `alerts.acknowledge` | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `alerts.configure` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Pharmacy — Prescriptions & dispensing

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `prescriptions.create` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.update` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.delete` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.dispense` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.substitute` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `prescriptions.verify` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `pharmacy.read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `pharmacy.list` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `pharmacy.view-stock` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `pharmacy.manage-stock` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `pharmacy.manage-catalog` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

### Laboratory

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `lab.create` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.update` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `lab.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.order` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `lab.accession` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.enter-result` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.approve-result` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `lab.manage-catalog` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

### Radiology

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `radiology.create` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.update` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `radiology.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.order` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `radiology.upload-image` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.report` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.sign-report` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `radiology.manage-catalog` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |

### Billing & Payments

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `invoices.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `invoices.read` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `invoices.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `invoices.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `invoices.list` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `payments.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `payments.read` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `payments.list` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `billing.refund` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `billing.void-invoice` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `billing.apply-discount` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `billing.reconcile` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

### Insurance — SHA claims

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `sha.read` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.list` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.verify-eligibility` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.create-claim` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.submit-claim` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.appeal-claim` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.pre-auth` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.track-claim` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `sha.reconcile` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

### Inpatient

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `inpatient.admit` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inpatient.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `inpatient.update` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inpatient.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `inpatient.transfer` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inpatient.discharge` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `wards.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `wards.list` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `wards.manage` | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inpatient.view-chart` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `inpatient.create-chart` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `mar.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `mar.administer` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Inventory

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `inventory.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `inventory.read` | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| `inventory.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `inventory.delete` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inventory.list` | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| `inventory.adjust-stock` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `inventory.receive-grn` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `purchase-orders.create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `purchase-orders.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `purchase-orders.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `purchase-orders.list` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `purchase-orders.approve` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Reporting

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `reporting.read` | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `reporting.list` | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `reporting.clinical` | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `reporting.financial` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `reporting.operational` | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `reporting.export` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |

### Communication

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `communication.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `communication.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `communication.send` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `communication.manage-templates` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `communication.message-provider` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Patient Portal

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `portal.access` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `portal.view-results` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `portal.view-invoices` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `portal.pay` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Documents / Storage

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `documents.create` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| `documents.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `documents.update` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `documents.delete` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `documents.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `documents.upload` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| `documents.download` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `documents.view-own` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Audit

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `audit.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `audit.list` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `audit.export` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Admin / System settings

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `settings.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `settings.update` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `catalog.manage` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `sequences.read` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Webhooks

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `webhooks.replay` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 7. Seeder strategy — `RolesAndPermissionsSeeder`

A single idempotent seeder is the **source of truth** for the permission/role wiring; the matrix
above is its specification. It runs in CI on every deploy (`db:seed --class=RolesAndPermissionsSeeder`)
and is safe to re-run (uses `firstOrCreate`).

### Outline

```php
class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Map of role slug => list of permission strings.
     * Derived 1:1 from 08-rbac-matrix.md. This array is the only place the matrix
     * is encoded in code; tests assert it matches the documented matrix.
     */
    private const MATRIX = [
        'hospital-admin' => ['*'],            // wildcard expanded to all permissions
        'doctor'         => [ /* ... */ ],
        'nurse'          => [ /* ... */ ],
        'receptionist'   => [ /* ... */ ],
        'records-officer'=> [ /* ... */ ],
        'pharmacist'     => [ /* ... */ ],
        'lab-technician' => [ /* ... */ ],
        'radiologist'    => [ /* ... */ ],
        'cashier'        => [ /* ... */ ],
        'patient'        => [ /* ... */ ],
    ];

    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define the canonical permission catalogue (all {module}.{action} strings).
        $allPermissions = $this->permissionCatalogue();          // flat string[]
        foreach ($allPermissions as $name) {
            Permission::findOrCreate($name, 'web');               // idempotent
        }

        // 2. Create roles and sync their permissions from MATRIX.
        foreach (self::MATRIX as $slug => $perms) {
            $role = Role::findOrCreate($slug, 'web');
            $grant = $perms === ['*'] ? $allPermissions : $perms;
            $role->syncPermissions($grant);                      // additive + revokes drift
        }

        // 3. Prune any permission no longer in the catalogue (handles renames/removals).
        Permission::whereNotIn('name', $allPermissions)->delete();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
```

### Strategy notes

1. **Single guard** `web` for every role and permission (Sanctum issues `web`-guarded tokens).
2. **Idempotent** via `findOrCreate` / `syncPermissions` — re-running converges to the matrix and
   **revokes drift** (a role losing a permission in the doc loses it in the DB on next seed).
3. **`hospital-admin` via wildcard**: seeded with the full catalogue. Optionally also wired with
   Spatie's `Gate::before` super-admin short-circuit so new permissions auto-apply — but the
   explicit grant keeps the audit/matrix honest.
4. **Catalogue method** `permissionCatalogue()` returns the authoritative flat list; a Pest test
   asserts `count()` and exact membership so the doc and code never silently diverge.
5. **Ordering**: this seeder runs **before** any `UserSeeder`/demo data so role assignment succeeds.
6. **Branch & subject scope are NOT permissions** — `branch.view-all` gates the `BranchScope`
   bypass, and `patient` ownership is enforced by policies/ownership scopes, not by Spatie alone.
7. **Production safety**: the prune step (3) never touches clinical data; it only removes orphan
   permission rows. Roles themselves are never deleted by the seeder.

---

## 8. Permission caching note

Spatie Laravel Permission caches the full permission/role lookup to avoid a DB hit on every
authorization check.

- **Store:** Redis (`config/permission.php` → `cache.store` = `default`, which is Redis per
  `00-foundation.md §1`). Key prefix `spatie.permission.cache`.
- **TTL:** 24 hours (`cache.expiration_time`). Authorization is read-heavy and the matrix changes
  rarely, so a long TTL is correct.
- **Invalidation (mandatory):** any code path that mutates roles/permissions —
  `givePermissionTo`, `revokePermissionTo`, `syncPermissions`, `assignRole`, the seeder — MUST
  call `app(PermissionRegistrar::class)->forgetCachedPermissions()` (Spatie does this automatically
  for its own mutators; the seeder calls it explicitly, see §7).
- **Deploy:** run `php artisan permission:cache-reset` (or `cache:forget spatie.permission.cache`)
  in the post-deploy step after re-seeding, so all app nodes pick up the new matrix immediately.
- **Multi-node:** because the cache lives in shared Redis (not per-process array cache), a single
  reset propagates to every web/queue node — no rolling-restart required.
- **Caveat:** the cache stores permission *definitions and role-permission links*, **not** a
  user's assigned roles; changing a user's roles takes effect on their next request without a
  global cache reset, but adding a brand-new permission string requires the reset above.
```

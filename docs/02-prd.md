# 02 — Product Requirements Document (PRD)

> **Authority:** This document is subordinate to `00-foundation.md`. Where any constant,
> identifier, role slug, module name, technology choice, or convention appears here, it
> matches the foundation exactly. If a conflict is ever found, `00-foundation.md` wins.

**Product name:** Afya HMS (working title)
**Context:** Private multi-branch hospital, Kenya. 100–300 patients/day. ~1,000 users now, architected for 10,000+.
**Document:** 02 · **Version:** 1.0 · **Status:** MVP baseline · **Date:** 2026-06-22
**Owner:** Product Management

---

## Table of contents

1. Purpose & background
2. Product goals & objectives
3. Success metrics (KPIs)
4. Personas (10 roles + patient)
5. Scope — MVP in / out
6. Detailed feature breakdown per module
7. Feature prioritization — MoSCoW
8. Release plan (MVP → v1 → v2)
9. Assumptions, constraints, dependencies
10. Acceptance criteria per major feature
11. Non-functional requirements (summary)
12. Open questions
13. Glossary & references

---

## 1. Purpose & background

Afya HMS is an integrated, web-based hospital management system for a private,
multi-branch hospital in Kenya. It replaces fragmented paper and point-solution
workflows (separate registration books, manual queues, paper EMR, spreadsheet
billing, manual NHIF/SHA claim filing) with a single, role-aware platform spanning
the full patient journey:

`Reception → Triage → Doctor → Lab → Pharmacy → Billing` (the canonical queue pipeline),
plus inpatient admission, radiology, inventory, reporting, communication, and a
patient self-service portal.

The system is a **modular monolith** (Laravel 11 / PHP 8.3+ REST API) with a separate
**React 18 + TypeScript PWA** front end, MySQL 8 primary store, and Redis for cache /
sessions / queues / real-time queue state — all as fixed in the foundation document.

### Why now
- Manual queues cause long, opaque waiting; no real-time visibility per station.
- Paper EMR is unsafe (no allergy/interaction alerts), unsearchable, and non-compliant with the **10-year retention** mandate.
- NHIF → **SHA** transition demands structured, trackable claims and pre-authorization.
- **M-Pesa** is the dominant payment rail; billing must integrate STK Push, Paybill, and Till natively.
- Multi-branch growth requires row-level branch isolation, branch switching, and consolidated executive reporting.

---

## 2. Product goals & objectives

| # | Goal | Objective (what "done" looks like) |
|---|------|------------------------------------|
| G1 | **One patient, one record** | A single longitudinal EMR per patient (`PAT-YYYY-000001`), visible across all branches subject to RBAC; no duplicate registrations. |
| G2 | **Cut waiting time & opacity** | Real-time queue board per station; emergency bypass honored; patients/staff see live position and ETA. |
| G3 | **Safer prescribing** | Allergy, drug–drug interaction, and duplicate-therapy alerts surfaced at point of prescribing and dispensing. |
| G4 | **Faster, accurate revenue capture** | Charges captured at point of service; M-Pesa + cash + SHA reconciled; near-zero unbilled services. |
| G5 | **SHA compliance** | Structured SHA claims and pre-auth with status tracking and resubmission. |
| G6 | **Operational visibility** | Per-branch and consolidated dashboards for throughput, revenue, stock, and clinical quality. |
| G7 | **Regulatory compliance** | Kenya Data Protection Act 2019, MOH requirements, immutable audit of PHI access, ≥10-year clinical retention. |
| G8 | **Scale & resilience** | Architected from 1,000 to 10,000+ users; PWA works on low-bandwidth devices with offline read + background-sync writes. |
| G9 | **Bilingual, accessible UX** | Full `en` + `sw` (Kiswahili) coverage; no hardcoded strings; light/dark theme. |

---

## 3. Success metrics (KPIs)

| Metric | Baseline (manual) | MVP target | v1 target |
|--------|-------------------|------------|-----------|
| Average outpatient turnaround (registration → exit) | Unknown / >3 h | Measured & visible | −25% |
| Duplicate patient records created / month | High | <2% of new registrations | <0.5% |
| Services billed vs delivered (leakage) | Unknown | ≥95% captured | ≥99% |
| M-Pesa payment auto-reconciliation rate | 0% | ≥90% | ≥98% |
| SHA claims submitted electronically | 0% | ≥80% of eligible | ≥95% |
| Prescriptions screened for allergy/interaction | 0% | 100% | 100% |
| Stock-outs of essential drugs / month | Unknown | Tracked + reorder alerts | −50% |
| Queue board uptime (business hours) | n/a | ≥99% | ≥99.5% |
| Audit coverage of PHI access events | 0% | 100% | 100% |

---

## 4. Personas

The 10 canonical roles (slugs from foundation §5) plus the patient persona. **MFA required**
for `hospital-admin`, `doctor`, `pharmacist`.

### 4.1 Hospital Admin — `hospital-admin`
- **Profile:** Operations/IT lead, manages all branches.
- **Goals:** Configure branches/users/roles, monitor cross-branch KPIs, ensure compliance.
- **Key capabilities:** `branch.view-all` (bypasses BranchScope), user & RBAC management, system settings, audit log review, consolidated reporting.
- **Pain solved:** No single view of operations; manual user provisioning; no audit trail.

### 4.2 Doctor — `doctor`
- **Profile:** Outpatient & inpatient clinician.
- **Goals:** See triaged queue, document SOAP notes, order labs/radiology, prescribe safely, view history.
- **Key capabilities:** EMR read/write, ordering, prescribing (alert-gated), inpatient rounds, results review.
- **Pain solved:** Paper notes, no decision support, no instant results.

### 4.3 Nurse — `nurse`
- **Profile:** Triage, vitals, ward care, medication administration.
- **Goals:** Perform MTS triage, record vitals, manage inpatient observations & MAR, assist doctors.
- **Key capabilities:** Triage (Manchester), vitals, nursing notes, inpatient charting, sample collection assist.
- **Pain solved:** Manual triage prioritization; illegible vitals charts.

### 4.4 Receptionist — `receptionist`
- **Profile:** Front desk / registration.
- **Goals:** Register/search patients, book appointments, check-in, issue queue tickets.
- **Key capabilities:** Patient registration & search, appointment booking, check-in, queue ticket issue, QR scan.
- **Pain solved:** Duplicate registration, paper queue numbers.

### 4.5 Records Officer — `records-officer`
- **Profile:** Health records / HIM.
- **Goals:** Maintain record integrity, merge duplicates, manage retention/archival, fulfil record requests.
- **Key capabilities:** Patient merge, demographic correction, document management, retention/archival oversight, ICD-10 governance.
- **Pain solved:** Lost files, no merge/correction workflow, no retention control.

### 4.6 Pharmacist — `pharmacist`
- **Profile:** Dispensing & drug inventory.
- **Goals:** Verify & dispense prescriptions safely, manage drug stock, batch/expiry control.
- **Key capabilities:** Prescription verification & dispensing (alert-gated), drug inventory, batch/expiry, reorder.
- **Pain solved:** No interaction screening at dispense, manual stock tracking, expired-stock risk.

### 4.7 Lab Technician — `lab-technician`
- **Profile:** Laboratory.
- **Goals:** Receive orders, collect/accession samples, enter results, flag abnormals.
- **Key capabilities:** Lab order worklist, sample accessioning (`LAB-...` barcode), result entry, validation, critical-value flag.
- **Pain solved:** Lost requisitions, manual result delivery, no critical alerting.

### 4.8 Radiologist — `radiologist`
- **Profile:** Imaging & reporting.
- **Goals:** Manage imaging worklist, attach images, author structured reports.
- **Key capabilities:** Radiology worklist (`RAD-...`), image upload/link, structured reporting, sign-off.
- **Pain solved:** Paper reports, no linkage to EMR.

### 4.9 Cashier / Accountant — `cashier`
- **Profile:** Billing & finance.
- **Goals:** Take payments, issue invoices/receipts, reconcile M-Pesa & cash, manage SHA claim financials.
- **Key capabilities:** Invoicing (`INV-...`), receipting (`RCP-...`), M-Pesa STK/Paybill/Till, cash, refunds, daily reconciliation, SHA claim financials.
- **Pain solved:** Manual receipting, unreconciled M-Pesa, revenue leakage.

### 4.10 Patient — `patient`
- **Profile:** Member of the public using the portal.
- **Goals:** Book/view appointments, see results & prescriptions, pay bills, view live queue position.
- **Key capabilities:** Patient Portal (self-register/link, appointments, results, invoices, M-Pesa pay, queue position, messages).
- **Pain solved:** No self-service; phone-only booking; no visibility of results or bills.

---

## 5. Scope — MVP

> Aligned to the canonical module list (foundation §1) and queue pipeline (§13).

### 5.1 In scope for MVP

| Module | MVP inclusion |
|--------|---------------|
| Auth / Tenancy / Admin | Sanctum auth, MFA for privileged roles, RBAC (Spatie), branches, branch switcher, user mgmt, system settings, audit logging. |
| Patients | Registration (`PAT-YYYY-000001`), search/dedupe, demographics, allergies, problem list, documents, QR ID card. |
| Appointments | Booking, calendar (FullCalendar), reschedule/cancel, reminders (SMS/email). |
| Queue | Real-time pipeline `Reception→Triage→Doctor→Lab→Pharmacy→Billing`, ticket issue, station boards, priority/emergency bypass. |
| Triage | Manchester Triage (Red/Orange/Yellow/Green/Blue), vitals capture, priority assignment. |
| EMR | SOAP encounters, vitals, history, allergies, problem/medication lists, attachments, ICD-10 coding. |
| Clinical Alerts | Allergy, drug–drug interaction, duplicate-therapy alerts at prescribe & dispense. |
| Pharmacy | Prescription verification/dispense, drug inventory, batch/expiry, basic reorder. |
| Laboratory | Order → sample (`LAB-...`) → result entry → critical-value flag → EMR linkage. |
| Radiology | Order → study (`RAD-...`) → image upload → structured report → sign-off. |
| Billing | Service catalog, invoices, receipts, M-Pesa (STK/Paybill/Till) + cash, reconciliation. |
| Insurance (SHA) | Eligibility capture, pre-auth, claim build/submit/track (`CLM-...`), resubmission. |
| Inpatient | Admission (`ADM-...`), bed/ward mgmt, rounds, nursing charts, MAR, discharge, inpatient billing accrual. |
| Inventory | Drug + general items, stock, batches/expiry, GRN, PO (`PO-...`), reorder alerts. |
| Reporting | Operational + financial + clinical dashboards (Recharts); per-branch & consolidated. |
| Communication | SMS (AfricasTalking) + email (Mailgun/Resend) notifications via abstraction. |
| Patient Portal | Self-service appointments, results, prescriptions, invoices/pay, queue position, messages. |
| Documents | Storage abstraction (local default), signed URLs. |
| QR / Barcode | Patient QR card, prescription QR (`RX-...`), lab/radiology barcodes (`LAB-/RAD-...`). |

### 5.2 Out of scope for MVP (deferred)

| Item | Target | Reason |
|------|--------|--------|
| Full DICOM PACS viewer | v2 | MVP uses image upload + signed URLs, not a diagnostic-grade viewer. |
| Native mobile apps (iOS/Android) | Post-v2 | PWA covers mobile in MVP. |
| Additional insurers beyond SHA | v2 | `InsurerGateway` abstraction ready; only `ShaGateway` implemented at MVP. |
| Telemedicine / video consults | v2 | Not required for in-person multi-branch flow. |
| Advanced clinical decision support (dosing calc, guidelines) | v2 | MVP ships allergy/interaction/duplicate only. |
| Theatre / surgery scheduling module | v1/v2 | Not in canonical module list for MVP. |
| Accounting GL / payroll integration | v2 | Billing exports CSV/API; full ERP later. |
| Public API for third parties | v2 | Internal REST only at MVP. |
| Biometric patient identification | Post-v2 | QR card + demographic match at MVP. |
| AI triage / predictive analytics | Post-v2 | Out of baseline. |

---

## 6. Detailed feature breakdown per module

> Each feature lists capability, primary roles, key identifiers, and notable rules.
> Identifiers, formats, tech, and abstractions are exactly as defined in the foundation.

### 6.1 Patients (`Patients`)
- **Registration:** capture demographics, contacts, next-of-kin, National ID/passport (stored as attribute, **never** the PK), photo. Generate `PAT-YYYY-000001` via `SequenceService`. Expose `public_id` UUID externally.
- **Search & dedupe:** fuzzy search (name, phone, ID, patient no.); duplicate-warning on registration; Records Officer **merge**.
- **Clinical attributes:** allergies, chronic conditions/problem list, current medications, blood group.
- **Documents:** upload (signed URLs via `DocumentService`), categorize, retain ≥10 years (soft-delete only).
- **QR ID card:** printable card encoding `public_id` for fast check-in scan.
- **Branch:** every patient row carries `branch_id`; cross-branch view via RBAC.

### 6.2 Appointments (`Appointments`)
- Book by branch, department, provider, slot; **FullCalendar** UI.
- Reschedule, cancel, no-show marking; waitlist (v1).
- Reminders via **NotificationChannelManager** (SMS AfricasTalking / email).
- Self-booking through Patient Portal (subject to provider availability).
- Check-in converts appointment → queue entry at `Reception`.

### 6.3 Queue (`Queue`)
- Canonical pipeline: `Reception → Triage → Doctor → Lab → Pharmacy → Billing` — directed, **skippable per visit type**.
- Ticket format `{DEPT}-{NNN}` daily reset (e.g. `TRI-014`, `DOC-007`).
- Real-time via **Redis + Laravel Broadcasting (WebSockets)**.
- **Priority + emergency bypass** honored at every station (driven by triage colour).
- Station boards (per department), call-next, transfer to next station, hold/recall.
- Public waiting-room display (anonymized) + patient live position in portal.

### 6.4 Triage (`Triage`)
- **Manchester Triage System**: Red (immediate), Orange (≤10 min), Yellow (≤60 min), Green (≤120 min), Blue (≤240 min).
- Capture presenting complaint, vitals (BP, HR, RR, SpO₂, temp, pain score), discriminators.
- Auto-set queue priority + emergency bypass from colour.
- Re-triage supported; full audit of colour changes.

### 6.5 EMR (`EMR`)
- **SOAP** encounter documentation (Subjective/Objective/Assessment/Plan).
- Vitals timeline; allergies, problem list, medication list (shared with Patients/Pharmacy).
- **ICD-10** diagnosis coding (global reference data, not branch-scoped).
- Orders launch points (lab, radiology, prescriptions).
- Attachments via signed URLs. Full version history; clinical data never hard-deleted (retention ≥10 years).
- Encrypted casts on sensitive columns; every PHI read written to immutable `audit_logs`.

### 6.6 Clinical Alerts (`ClinicalAlerts`)
- **Allergy alerts** (patient allergy vs ordered drug class/ingredient).
- **Drug–drug interaction** checks at prescribe and dispense.
- **Duplicate-therapy** detection.
- Severity-graded; require acknowledge/override with reason (audited).
- Fires at both **doctor prescribe** and **pharmacist dispense** gates.

### 6.7 Pharmacy (`Pharmacy`)
- Prescription queue from EMR; format `RX-{BRANCH}-YYYY-000001`, QR-coded.
- **Verification** (interaction/allergy re-check) → **dispense** with batch selection (FEFO).
- Decrement inventory on dispense; partial dispense supported.
- Drug catalog = global master reference (not branch-scoped); stock is branch-scoped.
- Counsel notes; label print with `RX-...` QR.

### 6.8 Laboratory (`Laboratory`)
- Order from EMR → worklist.
- Sample accessioning generates `LAB-{BRANCH}-YYMMDD-0001`, **barcoded**.
- Result entry against analyte ranges; abnormal & **critical-value** flagging → alert + notify ordering doctor.
- Validation/release workflow; results auto-linked to EMR; PDF report (signed URL).

### 6.9 Radiology (`Radiology`)
- Order from EMR → modality worklist.
- Study id `RAD-{BRANCH}-YYMMDD-0001`.
- Image upload/link (signed URLs; **not** a diagnostic DICOM viewer at MVP).
- Structured report authoring + radiologist **sign-off**; linked to EMR; PDF.

### 6.10 Billing (`Billing`)
- Service/charge catalog; charges captured at point of service across modules.
- Invoice `INV-{BRANCH}-YYYY-000001`; receipt `RCP-{BRANCH}-YYYY-000001` (per-branch, per-year).
- Money `DECIMAL(12,2)`, `KES`.
- **PaymentGateway** interface: `MpesaDarajaGateway` (STK Push, Paybill, Till) + `CashGateway`.
- M-Pesa callbacks via **signed webhook routes, idempotent** by `CheckoutRequestID`/`mpesa_receipt`.
- Refunds, adjustments, daily reconciliation report.

### 6.11 Insurance — SHA (`Insurance`)
- **InsurerGateway** interface; **ShaGateway** implementation.
- Member eligibility capture, **pre-authorization**, claim build/submit, status **tracking**, resubmission.
- Claim id `CLM-{BRANCH}-YYYY-00001`.
- Split billing (insurer vs patient co-pay) feeding Billing.

### 6.12 Inpatient (`Inpatient`)
- Admission `ADM-{BRANCH}-YYYY-00001`; ward/bed assignment & board.
- Doctor rounds & progress notes; nursing observations; **MAR** (medication administration record).
- Transfers, bed status, discharge summary.
- Inpatient charge accrual → Billing (room/day, procedures, drugs, labs).

### 6.13 Inventory (`Inventory`)
- Drugs (linked to global drug catalog) + general items; branch-scoped stock.
- **Batch & expiry** tracking, FEFO; stock adjustments.
- **GRN** (goods received) against **PO** `PO-{BRANCH}-YYYY-0001`.
- Reorder-level alerts; expiry alerts; stock valuation report.

### 6.14 Reporting (`Reporting`)
- Operational: throughput, queue/wait times, appointment utilization, no-shows.
- Financial: revenue by branch/service/payer, M-Pesa vs cash vs SHA, outstanding.
- Clinical: diagnoses (ICD-10), lab/radiology volumes, alert overrides.
- Inventory: stock levels, expiries, reorder.
- **Recharts** dashboards; per-branch and **consolidated** (requires `branch.view-all`); CSV export.

### 6.15 Communication (`Communication`)
- **NotificationChannelManager**: SMS = AfricasTalking; Email = Mailgun/Resend (configurable in `config/notifications.php`).
- Triggers: appointment reminders, results-ready, payment receipt, queue-call, prescription-ready.
- Templated, bilingual (`en`/`sw`); delivery status tracking; never calls a provider SDK directly.

### 6.16 Patient Portal (`PatientPortal`)
- Self-register / link to existing record (verified).
- View/book/reschedule appointments; live queue position; results (released only); prescriptions; invoices.
- **Pay via M-Pesa STK Push**; download receipts.
- Secure messaging; bilingual; PWA install.

### 6.17 QR / Barcode (cross-cutting; uses `Documents`/`Patients`/`Pharmacy`/`Laboratory`/`Radiology`)
- **Patient QR ID card** encodes `public_id` → instant check-in scan.
- **Prescription QR** on `RX-...` labels.
- **Lab barcode** on `LAB-...` samples; **Radiology** `RAD-...` study labels.
- Scanning supported in reception, lab accessioning, and pharmacy dispense flows.

---

## 7. Feature prioritization — MoSCoW

| Feature / capability | Module | MoSCoW | Release |
|----------------------|--------|--------|---------|
| Sanctum auth + MFA (privileged roles) | Auth | Must | MVP |
| RBAC (Spatie) + permission matrix | Auth/Admin | Must | MVP |
| Branches + BranchScope + branch switcher | Tenancy | Must | MVP |
| Patient registration (`PAT-...`) + search | Patients | Must | MVP |
| Duplicate warning + Records Officer merge | Patients | Should | MVP |
| Patient QR ID card | QR/Barcode | Should | MVP |
| Appointment booking + FullCalendar | Appointments | Must | MVP |
| Appointment reminders (SMS/email) | Communication | Should | MVP |
| Appointment waitlist | Appointments | Could | v1 |
| Real-time queue pipeline + boards | Queue | Must | MVP |
| Emergency bypass / priority | Queue/Triage | Must | MVP |
| Public waiting-room display | Queue | Should | v1 |
| Manchester triage + vitals | Triage | Must | MVP |
| SOAP EMR + ICD-10 | EMR | Must | MVP |
| EMR version history | EMR | Must | MVP |
| Allergy + interaction + duplicate alerts | ClinicalAlerts | Must | MVP |
| Advanced CDS (dosing/guidelines) | ClinicalAlerts | Won't (MVP) | v2 |
| Prescription verify + dispense | Pharmacy | Must | MVP |
| Batch/expiry FEFO dispensing | Pharmacy | Must | MVP |
| Lab order→sample→result + critical flag | Laboratory | Must | MVP |
| Radiology order→study→report + sign-off | Radiology | Must | MVP |
| Full DICOM PACS viewer | Radiology | Won't (MVP) | v2 |
| Service catalog + invoicing/receipting | Billing | Must | MVP |
| M-Pesa STK/Paybill/Till | Billing | Must | MVP |
| Cash payments + reconciliation | Billing | Must | MVP |
| Refunds/adjustments | Billing | Should | MVP |
| SHA eligibility + pre-auth + claims | Insurance | Must | MVP |
| Additional insurers | Insurance | Won't (MVP) | v2 |
| Inpatient admission + bed mgmt | Inpatient | Must | MVP |
| MAR + nursing charts | Inpatient | Must | MVP |
| Inpatient billing accrual | Inpatient | Should | MVP |
| Inventory stock + batch/expiry | Inventory | Must | MVP |
| PO + GRN | Inventory | Should | MVP |
| Reorder/expiry alerts | Inventory | Should | MVP |
| Operational + financial dashboards | Reporting | Must | MVP |
| Consolidated cross-branch reporting | Reporting | Should | MVP |
| Clinical quality dashboards | Reporting | Could | v1 |
| SMS/email notification abstraction | Communication | Must | MVP |
| Patient Portal: appts/results/pay | PatientPortal | Should | MVP |
| Patient Portal secure messaging | PatientPortal | Could | v1 |
| Document storage + signed URLs | Documents | Must | MVP |
| Immutable audit log (PHI access) | Audit | Must | MVP |
| Offline PWA reads + background sync writes | Frontend | Should | v1 |
| Telemedicine / video | — | Won't | v2 |
| Native mobile apps | — | Won't | Post-v2 |

---

## 8. Release plan

### 8.1 MVP — "Patient journey end-to-end"
**Theme:** A patient can be registered, queued, triaged, seen, ordered for, dispensed, and billed — in one branch, with SHA & M-Pesa, on a real-time queue, with safety alerts and audit.

- Auth/RBAC/MFA, branches + switcher, audit.
- Patients (register/search/merge/QR), Appointments (+ reminders).
- Queue (real-time, bypass), Triage (Manchester).
- EMR (SOAP, ICD-10, history), Clinical Alerts (allergy/interaction/duplicate).
- Pharmacy (verify/dispense, batch/expiry), Laboratory, Radiology (upload + report).
- Billing (catalog, invoice/receipt, M-Pesa, cash, reconciliation), SHA (eligibility/pre-auth/claims).
- Inpatient (admission/bed/rounds/MAR/discharge + accrual).
- Inventory (stock/batch/expiry, PO/GRN, reorder).
- Reporting (operational/financial/consolidated), Communication (SMS/email).
- Patient Portal (appts/results/prescriptions/invoices/M-Pesa pay/queue position).
- Storage abstraction (local default), QR/barcode across flows.

**Exit criteria:** all "Must" rows in §7 delivered with acceptance criteria (§10) met; ≥80% test coverage; full audit on PHI; KPIs instrumented.

### 8.2 v1 — "Optimize & self-serve"
- Appointment waitlist; public waiting-room displays.
- Offline PWA reads + background-sync writes (foundation §10 PWA).
- Patient Portal secure messaging.
- Clinical-quality dashboards; richer financial analytics + scheduled exports.
- Performance hardening toward 10,000+ users.

### 8.3 v2 — "Extend & integrate"
- Full DICOM PACS viewer (Radiology).
- Additional insurers via `InsurerGateway`.
- Advanced clinical decision support (dosing, guidelines).
- Telemedicine / video consults.
- Accounting GL export / ERP integration; public API.
- Theatre/surgery scheduling.

### 8.4 Post-v2 (backlog)
- Native mobile apps; biometric patient ID; AI triage / predictive analytics.

---

## 9. Assumptions, constraints, dependencies

### 9.1 Assumptions
- Branches have reliable-enough connectivity; PWA mitigates intermittent drops (offline reads in v1).
- Staff have shared/personal devices with modern browsers (PWA-capable).
- SHA and M-Pesa Daraja sandbox + production credentials are obtainable.
- Drug catalog master, ICD-10, and SHA tariff data can be sourced/loaded as global reference data.
- One shared MySQL database with row-level branch isolation is acceptable to the client.

### 9.2 Constraints
- **Architecture is fixed** by foundation: modular monolith, Laravel 11/PHP 8.3+, React 18/TS strict, MySQL 8, Redis; REST only; no Blade UI except mail/PDF.
- All identifiers, money (`DECIMAL(12,2)` KES), and timestamp (UTC store / `Africa/Nairobi` render) rules are non-negotiable.
- RBAC via Spatie; MFA mandatory for `hospital-admin`, `doctor`, `pharmacist`.
- Clinical data **never hard-deleted**; retention ≥10 years (soft-delete + archival).
- Bilingual `en`/`sw`; no hardcoded strings; no emojis; no inline CSS/JS logic.
- Conventional Commits, Pint/PSR-12, ESLint/Prettier, ≥80% test coverage gates.

### 9.3 Dependencies
| Dependency | Purpose | Owner |
|------------|---------|-------|
| M-Pesa Daraja (STK/Paybill/Till) | Payments | Finance / vendor |
| SHA API | Eligibility, pre-auth, claims | Compliance / SHA |
| AfricasTalking | SMS | Comms vendor |
| Mailgun / Resend | Email | Comms vendor |
| ICD-10 dataset | Diagnosis coding | Records Officer |
| Drug interaction/allergy dataset | Clinical Alerts | Pharmacy / vendor |
| Storage (local→s3/r2/b2) | Documents | DevOps |
| Redis + WebSocket infra | Queue real-time | DevOps |

---

## 10. Acceptance criteria per major feature

> Format: Given / When / Then. One block per major feature.

### 10.1 Authentication & RBAC
- **Given** a privileged user (`hospital-admin`/`doctor`/`pharmacist`), **when** they log in, **then** MFA (TOTP) is required and login history/device/IP is recorded.
- **Given** any user, **when** they call an endpoint lacking the required `{module}.{action}` permission, **then** the request is denied (403) and the attempt is audited.

### 10.2 Branch tenancy
- **Given** a user with one active branch, **when** they query operational data, **then** only their `active_branch_id` rows return (BranchScope), except global reference data.
- **Given** a user with `branch.view-all`, **when** they enable consolidated view, **then** cross-branch data is returned.
- **Given** a multi-branch user, **when** they use the branch switcher, **then** `active_branch_id` updates in the session/token and subsequent data scopes accordingly.

### 10.3 Patient registration
- **Given** new patient details, **when** registered, **then** a unique `PAT-YYYY-000001` is issued via `SequenceService` and a `public_id` UUID is exposed; National ID is stored as an attribute, never as PK.
- **Given** details matching an existing patient, **when** registering, **then** a duplicate warning is shown; a Records Officer can merge records preserving history.

### 10.4 Appointments
- **Given** an available slot, **when** booked, **then** the appointment is created branch-scoped and a reminder is queued (SMS/email).
- **Given** a checked-in appointment, **when** check-in occurs, **then** a `Reception` queue entry is created.

### 10.5 Queue
- **Given** a visit, **when** a ticket is issued, **then** it follows `{DEPT}-{NNN}` daily-reset format and appears on the station board in real time.
- **Given** a Red/Orange triage patient, **when** they enter a station queue, **then** emergency bypass places them ahead per priority, audited.

### 10.6 Triage
- **Given** a patient in `Triage`, **when** the nurse records complaint + vitals and selects an MTS colour, **then** queue priority and target time (Red immediate … Blue ≤240 min) are set automatically and the change is audited.

### 10.7 EMR
- **Given** a doctor in an encounter, **when** they save a SOAP note with ICD-10 codes, **then** it is versioned, branch-scoped, never hard-deletable, and the PHI access is audited.

### 10.8 Clinical alerts
- **Given** a prescription for a drug the patient is allergic to or that interacts/duplicates therapy, **when** the doctor prescribes or the pharmacist dispenses, **then** a severity-graded alert blocks until acknowledged/overridden with a reason, which is audited.

### 10.9 Pharmacy
- **Given** an `RX-...` prescription, **when** dispensed, **then** alerts are re-checked, batch is selected FEFO, branch stock decrements, and a QR label prints; partial dispense is supported.

### 10.10 Laboratory
- **Given** a lab order, **when** a sample is accessioned, **then** a barcoded `LAB-{BRANCH}-YYMMDD-0001` is generated; **when** a critical value is entered, **then** it is flagged and the ordering doctor is notified; released results link to EMR.

### 10.11 Radiology
- **Given** a radiology order, **when** a study `RAD-{BRANCH}-YYMMDD-0001` is created and images uploaded, **then** the radiologist authors and signs off a structured report linked to EMR; images served via signed URLs.

### 10.12 Billing & payments
- **Given** delivered services, **when** invoiced, **then** `INV-{BRANCH}-YYYY-000001` is issued with `DECIMAL(12,2)` KES totals.
- **Given** an M-Pesa STK payment, **when** the Daraja callback arrives, **then** it is processed idempotently by `CheckoutRequestID`/`mpesa_receipt`, a `RCP-...` receipt is issued, and it appears in daily reconciliation.

### 10.13 SHA insurance
- **Given** an SHA member, **when** eligibility/pre-auth is captured and a claim built, **then** `CLM-{BRANCH}-YYYY-00001` is submitted via `ShaGateway`, status is tracked, and rejected claims can be resubmitted.

### 10.14 Inpatient
- **Given** an admission, **when** created, **then** `ADM-{BRANCH}-YYYY-00001` is issued and a bed assigned; rounds, nursing notes, and MAR entries are recorded; on discharge a summary is produced and charges accrue to Billing.

### 10.15 Inventory
- **Given** a PO `PO-{BRANCH}-YYYY-0001`, **when** goods are received via GRN, **then** branch stock and batches/expiry update; **when** stock falls below reorder level or nears expiry, **then** alerts are raised.

### 10.16 Reporting
- **Given** a manager, **when** they open a dashboard, **then** Recharts visualizations render per-branch data; consolidated views require `branch.view-all`; data is exportable to CSV.

### 10.17 Communication
- **Given** a trigger (reminder/results/receipt/queue-call), **when** fired, **then** the message is sent via the configured channel (AfricasTalking SMS / Mailgun|Resend email) through `NotificationChannelManager`, in the patient's language, with delivery status tracked.

### 10.18 Patient Portal
- **Given** a verified patient, **when** they log in, **then** they can book/reschedule appointments, view released results & prescriptions, view live queue position, view invoices, and pay via M-Pesa STK with a downloadable receipt.

### 10.19 Documents & QR/Barcode
- **Given** a clinical file, **when** accessed, **then** it is served via a time-limited signed URL (no public bucket).
- **Given** a patient QR card / `RX`/`LAB`/`RAD` code, **when** scanned, **then** the correct record/sample/study is resolved in the relevant flow.

---

## 11. Non-functional requirements (summary)

| Area | Requirement |
|------|-------------|
| Performance | Support 100–300 patients/day, 1,000 users now; architected to 10,000+. Queue updates real-time (<2 s perceived). |
| Availability | Queue board ≥99% business-hours uptime (MVP), ≥99.5% (v1). |
| Security | Sanctum, MFA for privileged roles, encrypted casts, TLS, CSRF, rate limiting, signed URLs, secure headers. |
| Audit & compliance | Immutable `audit_logs` for PHI/security events; Spatie Activity Log for model changes; Kenya DPA 2019, MOH; retention ≥10 years. |
| Localization | Full `en` + `sw`; `Africa/Nairobi` rendering; KES money. |
| Accessibility/UX | Light/dark theme; no emojis; icon registry; responsive PWA. |
| Quality | ≥80% test coverage (Pest/PHPUnit, Vitest/RTL/Playwright); CI gates; Conventional Commits. |

---

## 12. Open questions

| # | Question | Owner | Needed by |
|---|----------|-------|-----------|
| Q1 | What is the authoritative source/licence for the drug–drug interaction & allergy dataset? | Pharmacy lead | Pre-Clinical Alerts build |
| Q2 | Are SHA production API specs/tariffs final, or do we build to sandbox first? | Compliance | Pre-SHA build |
| Q3 | Which email provider (Mailgun vs Resend) is the launch default? | DevOps | Pre-MVP config |
| Q4 | Confirmed branch list & codes (e.g. `NRB`) and go-live order? | Hospital Admin | Pre-Tenancy seed |
| Q5 | Storage driver for production launch (s3 / r2 / b2) — local is dev default only? | DevOps | Pre-prod |
| Q6 | Required regulatory report formats for MOH submission? | Compliance | v1 reporting |
| Q7 | Self-registration identity-verification method for Patient Portal (OTP-only vs in-person link)? | Records / Security | Pre-Portal build |
| Q8 | Lab analyte master list & reference ranges source? | Lab lead | Pre-Lab build |
| Q9 | Co-pay / split-billing rules for SHA vs patient — fixed or scheme-specific? | Finance | Pre-Billing/SHA build |
| Q10 | Inpatient charge rules (room/day rounding, level-of-care tiers)? | Finance | Pre-Inpatient build |

---

## 13. Glossary & references

- **Glossary:** see foundation §15 — EMR, SOAP, SHA, MTS, GRN, PO, STK, RBAC, PWA, DTO.
- **Canonical source:** `00-foundation.md` (architecture, identifiers, roles, tenancy, payments, notifications, storage, security, triage, queue, conventions).
- **Related (planned):** `08-rbac-matrix.md` (full permission matrix).

# 03 — Software Requirements Specification (SRS)

> **Product:** Afya HMS — Hospital Management System
> **Style:** IEEE Std 830-1998 (Recommended Practice for Software Requirements Specifications)
> **Document version:** 1.0 · **Status:** MVP baseline · **Date:** 2026-06-22
> **Authority note:** This SRS is subordinate to `00-foundation.md`. Where any requirement here appears to conflict with a canonical decision in the Foundation document, the Foundation document wins and this SRS must be corrected.

---

## Table of contents

1. Introduction
2. Overall description
3. External interface requirements
4. System features (functional requirements)
5. Nonfunctional requirements
6. Other requirements
- Appendix A: Requirement traceability summary
- Appendix B: Analysis models (state, data flow)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines, completely and unambiguously, the functional and nonfunctional requirements for **Afya HMS**, a production Hospital Management System for a private, multi-branch hospital operating in Kenya. It is written for, and to be used by:

- **Software engineers and architects** implementing the system (backend Laravel, frontend React, DevOps).
- **Quality assurance engineers** deriving test cases from numbered requirements.
- **Product owners and clinical stakeholders** validating that the product meets operational and regulatory needs.
- **Compliance and data-protection officers** verifying alignment with the Kenya Data Protection Act, 2019 (KDPA) and Ministry of Health (MOH) requirements.

Every requirement in this document is uniquely identified (e.g. `FR-PAT-001`, `NFR-PERF-002`) to support bidirectional traceability into design, code, and test artifacts.

### 1.2 Scope

**Afya HMS** is a single deployable, modular-monolith application that digitizes the end-to-end clinical and administrative operations of a hospital across multiple branches.

**The product SHALL:**

- Manage the full patient journey: registration, appointment, queueing, triage, consultation (EMR), diagnostics (laboratory, radiology), pharmacy dispensing, inpatient admission, billing, and insurance claiming.
- Provide a real-time, branch-aware queue management system across the canonical pipeline `Reception → Triage → Doctor → Lab → Pharmacy → Billing`.
- Enforce row-level multi-branch data isolation with controlled cross-branch reporting.
- Integrate with external services: **M-Pesa Daraja** (payments), **SHA** (Social Health Authority insurance), **Africa's Talking** (SMS), **Mailgun/Resend** (email), **OpenFDA** (drug reference/interaction enrichment), and pluggable object-storage drivers (local, S3, Cloudflare R2, Backblaze B2).
- Provide a patient-facing portal/PWA for appointments, results, prescriptions, invoices, and notifications.
- Maintain immutable audit trails and retain medical records for at least **10 years** per Kenyan regulation.

**The product SHALL NOT (out of scope for this baseline):**

- Replace specialized PACS/DICOM image viewing hardware (it stores reports and study metadata and references; it is not a diagnostic-grade image viewer).
- Provide medical-device firmware or HL7/FHIR interface engines (planned as a future integration layer; not in MVP).
- Provide payroll, full general-ledger accounting, or HR management beyond user/role administration.

**Benefits/objectives:** reduce patient wait times via real-time queueing, eliminate paper records, enforce clinical safety (allergy/interaction alerts), accelerate revenue cycle (M-Pesa + SHA), and guarantee regulatory compliance and auditability.

### 1.3 Definitions, acronyms, and abbreviations

| Term | Definition |
|---|---|
| Afya HMS | The product specified by this document. |
| Branch | A physical hospital site; tenant boundary for row-level isolation (`branch_id`). |
| EMR | Electronic Medical Record. |
| SOAP | Clinical note structure: Subjective, Objective, Assessment, Plan. |
| SHA | Social Health Authority (Kenya) — national health insurer; successor to NHIF. |
| MTS | Manchester Triage System (5-level acuity). |
| Daraja | Safaricom M-Pesa API platform (STK Push, Paybill, Till, C2B/B2C). |
| STK Push | SIM Toolkit payment prompt initiated to a payer's phone. |
| GRN | Goods Received Note (inventory). |
| PO | Purchase Order. |
| RBAC | Role-Based Access Control. |
| MFA / TOTP | Multi-Factor Authentication / Time-based One-Time Password. |
| PWA | Progressive Web App. |
| DTO | Data Transfer Object. |
| PHI | Protected Health Information. |
| KDPA | Kenya Data Protection Act, 2019. |
| ICD-10 | International Classification of Diseases, 10th revision. |
| OpenFDA | U.S. FDA open data API used for drug label/interaction enrichment. |
| RPO / RTO | Recovery Point Objective / Recovery Time Objective. |
| FR / NFR | Functional Requirement / Nonfunctional Requirement. |
| SHALL / SHOULD / MAY | Conformance keywords per RFC 2119 (mandatory / recommended / optional). |

### 1.4 References

1. `00-foundation.md` — Afya HMS Foundation & Canonical Decisions, v1.0 (governing document).
2. IEEE Std 830-1998 — Recommended Practice for Software Requirements Specifications.
3. RFC 2119 — Key words for use in RFCs to Indicate Requirement Levels.
4. Kenya Data Protection Act, No. 24 of 2019, and the Data Protection (General) Regulations, 2021.
5. Kenya Health Act, No. 21 of 2017 (medical records, confidentiality, retention).
6. Social Health Authority (SHA) / Social Health Insurance Fund (SHIF) provider integration specifications.
7. Safaricom Daraja API documentation (M-Pesa Express / STK Push, C2B, B2C, transaction status).
8. Africa's Talking SMS API documentation.
9. Mailgun and Resend transactional email API documentation.
10. openFDA Drug API documentation (drug label and adverse-event endpoints).
11. Manchester Triage Group — Emergency Triage, 3rd edition (acuity standard).
12. WHO ICD-10 classification.
13. Future companion deliverables: `08-rbac-matrix.md` (RBAC matrix), data dictionary, API spec, deployment guide.

### 1.5 Overview

Section 2 gives the overall, mostly narrative description of the product and its constraints. Section 3 specifies external interfaces (UI, hardware, software, communications). Section 4 specifies system features as functional requirements grouped per module, each with a stimulus/response description and numbered `FR-*` requirements. Section 5 specifies nonfunctional requirements (`NFR-*`). Section 6 covers remaining requirements (retention, internationalization, legal). Appendices provide traceability and analysis models.

---

## 2. Overall description

### 2.1 Product perspective

Afya HMS is a **new, self-contained modular-monolith** system (not a member of an existing product family and not a component embedded in a larger system). It replaces paper records, spreadsheets, and disconnected point solutions.

- **System interfaces:** A single Laravel 11 backend exposes a versioned REST API and a WebSocket broadcast channel. A React 18 SPA/PWA is the primary client. External systems (Daraja, SHA, Africa's Talking, Mailgun/Resend, OpenFDA, object storage) are reached through provider-abstraction layers, never called directly from feature code.
- **Architecture context (from Foundation §1–§2):**

```
                 ┌──────────────────────────────┐
   Patients ───▶ │  React 18 PWA (SPA)          │
   Staff    ───▶ │  TanStack Query / Zustand    │
                 └──────────────┬───────────────┘
                       HTTPS REST│  WSS broadcast
                                 ▼
                 ┌──────────────────────────────┐
                 │  Laravel 11 modular monolith │
                 │  Route→Controller→FormRequest│
                 │  →Service→Repository→Model    │
                 │  Sanctum auth · Spatie RBAC   │
                 └───┬───────┬────────┬──────────┘
            MySQL 8 ─┘       │        └─ Redis (cache/session/queue/broadcast)
                             │
        ┌────────────────────┼────────────────────────────────┐
        ▼          ▼         ▼          ▼          ▼            ▼
     Daraja      SHA   AfricasTalking Mailgun/  OpenFDA   Storage drivers
   (M-Pesa)  (insurer)   (SMS)        Resend    (drug ref) local/s3/r2/b2
```

- **User interfaces:** Web SPA (responsive, light/dark, en/sw). See §3.1.
- **Hardware interfaces:** Commodity workstations, tablets, and smartphones; thermal/label printers; device cameras for QR/barcode scanning (no dedicated scanner hardware required). See §3.2.
- **Software interfaces:** Laravel 11, PHP 8.3, MySQL 8, Redis, plus the external APIs above. See §3.3.
- **Communications interfaces:** HTTPS/TLS REST, WebSocket (WSS) broadcasting, SMTP/HTTP email, SMS gateway. See §3.4.
- **Memory / operations constraints:** Designed to run on modest cloud nodes for ~1,000 concurrent users at MVP, horizontally scalable toward 10,000+ (see §5.4).
- **Site adaptation:** Per-branch configuration (codes, sequences, printers, paybill/till) without code changes.

### 2.2 Product functions (summary)

At a high level, Afya HMS provides:

1. **Identity & access** — authentication, MFA, RBAC, multi-branch access, session/device tracking.
2. **Patient management** — registration with canonical `PAT-YYYY-000001` numbers, demographics, next-of-kin, documents, merge.
3. **Scheduling & queueing** — appointments, real-time queue board, priority/emergency bypass across the canonical pipeline.
4. **Triage** — Manchester Triage System acuity assignment and vitals.
5. **Clinical (EMR)** — SOAP notes, diagnoses (ICD-10), orders, allergies, problem list, clinical alerts.
6. **Pharmacy** — prescriptions (`RX-…`, QR-coded), dispensing, drug interaction/allergy checks, stock decrement.
7. **Laboratory** — test orders, barcoded samples (`LAB-…`), result entry, verification, reporting.
8. **Radiology** — study orders (`RAD-…`), report capture, file references.
9. **Billing & payments** — invoices/receipts, M-Pesa (STK/Paybill/Till), cash, refunds.
10. **Insurance (SHA)** — eligibility, pre-authorization, claims (`CLM-…`), tracking.
11. **Inpatient** — admission (`ADM-…`), bed/ward management, ward rounds, discharge.
12. **Inventory** — drug/consumable catalog, stock, POs (`PO-…`), GRNs, expiry/reorder.
13. **Reporting & analytics** — operational, clinical, and financial dashboards; cross-branch executive views.
14. **Communication** — SMS/email notifications and reminders via abstracted channels.
15. **Patient portal** — self-service appointments, results, prescriptions, invoices.
16. **Audit & compliance** — immutable audit trail, PHI access logging, retention enforcement.
17. **Administration** — branches, users, roles, sequences, system settings.

### 2.3 User classes and characteristics

Maps to the 10 canonical roles (Foundation §5). MFA-required classes are flagged.

| User class | Role slug | Technical skill | Frequency | Privilege | MFA |
|---|---|---|---|---|---|
| Hospital Admin | `hospital-admin` | High | Daily | Full, cross-branch (`branch.view-all`) | **Required** |
| Doctor | `doctor` | Medium | Continuous | Clinical write, order, prescribe | **Required** |
| Nurse | `nurse` | Medium | Continuous | Triage, vitals, ward care, med admin | Optional |
| Receptionist | `receptionist` | Low–Medium | Continuous | Register, schedule, queue intake | Optional |
| Records Officer | `records-officer` | Medium | Daily | Records, merges, document control | Optional |
| Pharmacist | `pharmacist` | Medium | Continuous | Dispense, inventory, interactions | **Required** |
| Lab Technician | `lab-technician` | Medium | Continuous | Sample handling, result entry | Optional |
| Radiologist | `radiologist` | Medium | Daily | Study reporting | Optional |
| Cashier/Accountant | `cashier` | Low–Medium | Continuous | Billing, payments, receipts | Optional |
| Patient | `patient` | Low | Occasional | Self-service portal only | Optional |

**System actors (non-human):** Daraja webhook caller, SHA endpoints, scheduler (queue workers/cron), and broadcast service.

### 2.4 Operating environment

| Layer | Technology (canonical) |
|---|---|
| Backend runtime | **PHP 8.3+**, **Laravel 11** |
| Primary datastore | **MySQL 8+** |
| Cache / session / queue / broadcast / queue-state | **Redis** |
| Frontend | **React 18 + TypeScript (strict) + Vite**, PWA |
| Auth | Laravel **Sanctum** (SPA token) |
| RBAC | **Spatie Laravel Permission** |
| Packaging / deployment | **Docker + Docker Compose** (local-dev friendly, cloud-ready) |
| Web server | Nginx + PHP-FPM (or Octane optional, future) |
| Client browsers | Evergreen Chrome, Edge, Firefox, Safari (last 2 major versions); Android/iOS mobile browsers |
| Real-time transport | WebSockets (Laravel Broadcasting; Reverb/Pusher-compatible) over WSS |

### 2.5 Design and implementation constraints

- **DC-1 — Architecture:** Modular monolith; one deployable Laravel app; no microservices (Foundation §1).
- **DC-2 — Layering:** Every module SHALL follow `Route → Controller → FormRequest → Service → Repository → Model`, with DTOs (`spatie/laravel-data`), Resources for JSON, and Events/Listeners for side-effects (Foundation §2).
- **DC-3 — No business logic in controllers**; all write endpoints validated by FormRequests; SOLID, no duplicated logic.
- **DC-4 — Identifiers/formats:** All canonical IDs, money (`DECIMAL(12,2)` KES, never floats), and UTC timestamps rendered in `Africa/Nairobi` per Foundation §3.
- **DC-5 — Tenancy:** Row-level isolation by `branch_id` via a global `BranchScope`; bypass only for `branch.view-all` (Foundation §4).
- **DC-6 — Sequence generation:** Only `SequenceService` writes the `sequences` table, using `SELECT … FOR UPDATE` within a transaction (Foundation §6).
- **DC-7 — Provider abstraction:** Storage, notifications, payments, and insurer integrations SHALL be accessed only through their manager/interface abstractions (Foundation §7–§9). No feature code references a concrete provider SDK.
- **DC-8 — Frontend conventions:** TanStack Query (server state), Zustand (client state), React Hook Form + Zod, React Router v6, react-i18next (`en`/`sw`), Tailwind (no inline CSS/JS logic), centralized SVG icons, **no emojis** (Foundation §10).
- **DC-9 — Security baseline:** Sanctum, encrypted casts for sensitive columns, TLS, CSRF, rate limiting, signed URLs, secure headers, MFA for privileged roles (Foundation §11).
- **DC-10 — Coding standards:** PHP PSR-12/Pint; TS ESLint/Prettier strict, no `any`; Conventional Commits; ≥80% test coverage (Foundation §14).
- **DC-11 — Clinical standards:** Manchester Triage acuity bands (Foundation §12); ICD-10 diagnoses; SOAP notes.
- **DC-12 — Never hard-delete clinical data**; soft-delete + archival only (Foundation §11, §6 retention).

### 2.6 Assumptions and dependencies

- **AS-1:** Reliable internet at each branch; the PWA provides a degraded offline read shell with background-sync for queued writes (Foundation §10) but full operation assumes connectivity.
- **AS-2:** Valid, funded credentials exist for Daraja, SHA, Africa's Talking, and the chosen email provider.
- **AS-3:** SHA exposes programmatic endpoints for eligibility/pre-auth/claims; if only manual portals are available at go-live, claim submission degrades to assisted/manual export (still tracked by `CLM-…`).
- **AS-4:** OpenFDA is an **enrichment** source only; clinical safety alerts MUST also rely on a curated local interaction/allergy dataset so the system remains safe if OpenFDA is unreachable.
- **AS-5:** Branch master data (codes, paybill/till, printers) is configured before a branch goes live.
- **AS-6:** Workstations/tablets have a camera for QR/barcode scanning; dedicated scanner hardware is optional, not required.
- **AS-7:** Time source is synchronized (NTP); DB stores UTC.

---

## 3. External interface requirements

### 3.1 User interfaces (UI)

- **UI-1:** The primary UI SHALL be the React 18 SPA/PWA, responsive across desktop, tablet, and mobile.
- **UI-2:** The UI SHALL support **light and dark** themes via Tailwind `class` strategy, persisted on the authenticated user profile in the database.
- **UI-3:** All user-facing text SHALL be internationalized via react-i18next with `en` and `sw` (Kiswahili) namespaces; **no hardcoded strings** and **no emojis** (centralized SVG icon registry instead).
- **UI-4:** Navigation SHALL include a **branch switcher** that sets `active_branch_id` for users with multi-branch access; the current branch SHALL be visible at all times.
- **UI-5:** Routes SHALL be guarded by `<ProtectedRoute permission="…">`; UI elements for unauthorized actions SHALL be hidden/disabled.
- **UI-6:** Forms SHALL use React Hook Form + Zod resolvers whose schemas mirror backend FormRequest rules; validation errors SHALL be shown inline per field.
- **UI-7:** Server state SHALL be fetched via TanStack Query with loading, empty, and error states for every data view.
- **UI-8:** The **Queue Board** SHALL update in real time over WebSockets, color-coded by Manchester Triage acuity (Red/Orange/Yellow/Green/Blue).
- **UI-9:** Accessibility: the UI SHOULD meet WCAG 2.1 AA (keyboard navigation, contrast, ARIA labels, focus states).
- **UI-10:** Dashboards SHALL render charts via **Recharts**; calendars/appointment grids via **FullCalendar**.
- **UI-11:** All clinical documents/images SHALL be displayed through time-limited **signed URLs**; the UI SHALL never embed public bucket URLs.
- **UI-12:** Times SHALL be displayed in `Africa/Nairobi` (UTC+3); money SHALL be displayed as `KES` with two decimals.

### 3.2 Hardware interfaces

- **HW-1:** The system SHALL generate **QR codes** (prescriptions `RX-…`) and **1D/2D barcodes** (lab samples `LAB-…`, radiology `RAD-…`, patient cards) for printing.
- **HW-2:** Scanning SHALL be performed using **the device camera via the browser** (web-based barcode/QR decoding); the system SHALL function **without dedicated scanner hardware**.
- **HW-3:** Manual entry SHALL always be available as a fallback for any scannable code (degraded-input requirement).
- **HW-4:** The system SHALL produce printable HTML/PDF artifacts (receipts, prescriptions, lab labels, wristbands, claim forms) compatible with standard A4/A5 and common thermal/label printers via the browser print pipeline.
- **HW-5:** No proprietary medical-device drivers are required for MVP; device integration is a future interface layer (out of scope, §1.2).

### 3.3 Software interfaces

#### 3.3.1 Platform software

- **SW-PLAT-1:** Backend SHALL target PHP 8.3+ on Laravel 11; persistence on MySQL 8+; Redis for cache/session/queue/broadcast/queue-state. The app SHALL run under Docker Compose.

#### 3.3.2 Payments — M-Pesa Daraja

- **SW-MPESA-1:** Payment integration SHALL be implemented behind a `PaymentGateway` interface with `MpesaDarajaGateway` and `CashGateway` implementations (Foundation §9).
- **SW-MPESA-2:** Supported Daraja flows SHALL include **STK Push**, **Paybill**, and **Till**.
- **SW-MPESA-3:** Daraja callbacks SHALL arrive on **signed webhook routes** and SHALL be **idempotent**, keyed by `CheckoutRequestID` and/or `mpesa_receipt`.
- **SW-MPESA-4:** The system SHALL support transaction status query/reconciliation for pending or lost callbacks.
- **SW-MPESA-5:** Daraja credentials and shortcodes SHALL be configurable per branch.

#### 3.3.3 Insurance — SHA

- **SW-SHA-1:** Insurance integration SHALL be implemented behind an `InsurerGateway` interface with a `ShaGateway` implementation, allowing future insurers (Foundation §9).
- **SW-SHA-2:** Capabilities SHALL include member **eligibility**, **pre-authorization**, **claim submission**, and **claim tracking** (`CLM-{BRANCH}-YYYY-00001`).
- **SW-SHA-3:** SHA responses and statuses SHALL be persisted with audit and retry handling for transient failures.

#### 3.3.4 SMS — Africa's Talking

- **SW-SMS-1:** SMS SHALL be sent only through the `NotificationChannelManager` with an Africa's Talking provider (Foundation §8); feature code SHALL NOT call the SDK directly.
- **SW-SMS-2:** Delivery reports/webhooks SHALL update notification status; failures SHALL be retried per policy.

#### 3.3.5 Email — Mailgun / Resend

- **SW-EMAIL-1:** Email SHALL be sent through the `NotificationChannelManager` with a configurable Mailgun **or** Resend provider (Foundation §8).
- **SW-EMAIL-2:** Email templates SHALL be the only Blade usage permitted on the backend (mail/PDF templates), localized en/sw.

#### 3.3.6 Drug reference — OpenFDA

- **SW-FDA-1:** The Pharmacy/ClinicalAlerts modules MAY enrich drug data using the **OpenFDA** Drug API (labels, interactions, adverse events).
- **SW-FDA-2:** OpenFDA SHALL be wrapped in a service with caching; results SHALL be cached in Redis/MySQL to bound external calls.
- **SW-FDA-3:** Safety-critical interaction/allergy checks SHALL NOT depend solely on OpenFDA; a curated local dataset SHALL be authoritative (see AS-4, FR-RX-004).

#### 3.3.7 Storage drivers

- **SW-STORE-1:** File storage SHALL be accessed via `StorageManager`/`DocumentService` supporting `local` (default), `s3`, `r2`, `b2`; selected by `config/storage.php` (Foundation §7).
- **SW-STORE-2:** No clinical bucket SHALL be public; all retrieval SHALL use time-limited signed URLs.

#### 3.3.8 Internal module interfaces

- **SW-INT-1:** Modules SHALL communicate in-process via service interfaces, DTOs, and domain events; no module SHALL reach into another module's Eloquent models or tables directly.

### 3.4 Communications interfaces

- **COMM-1:** All client–server traffic SHALL use **HTTPS/TLS 1.2+**; the API SHALL be a versioned **REST** API returning JSON (Resources).
- **COMM-2:** Real-time updates (queue, alerts, notifications) SHALL use **WebSocket (WSS)** via Laravel Broadcasting on Redis; channels SHALL be authorized and branch-scoped.
- **COMM-3:** Inbound webhooks (Daraja, SMS delivery, email events) SHALL be authenticated (signature/secret) and idempotent.
- **COMM-4:** API authentication SHALL use Sanctum tokens; CSRF protection, rate limiting, and secure headers SHALL be enforced.
- **COMM-5:** API responses SHALL use standard HTTP status codes and a consistent error envelope (code, message, errors[]).
- **COMM-6:** Outbound email SHALL use the provider's HTTPS API (or SMTP) and SMS the gateway's HTTPS API.

---

## 4. System features (functional requirements)

> Each feature lists a **Description/priority**, a **Stimulus/response** sequence, and numbered **functional requirements**. IDs follow `FR-{MODULE}-{NNN}`. Unless stated, all operations are subject to RBAC (Foundation §5), `BranchScope` isolation (Foundation §4), audit logging (§4.18), and validation via FormRequests (DC-3).

### 4.1 Authentication & access (Auth)

**Description/priority:** Secure sign-in, MFA for privileged roles, session/device security. **Priority: Critical.**

**Stimulus/response:** User submits credentials → system validates → if MFA-required role, prompts TOTP → issues Sanctum token + active branch claim → records login history. Invalid attempts are throttled and logged.

- **FR-AUTH-001:** The system SHALL authenticate users via email/username + password using Laravel Sanctum and issue an SPA token.
- **FR-AUTH-002:** The system SHALL require **TOTP MFA** for roles `hospital-admin`, `doctor`, and `pharmacist`, and SHALL allow optional MFA enrolment for other roles.
- **FR-AUTH-003:** The system SHALL enforce a configurable **idle session timeout** and **password expiry**, prompting re-authentication.
- **FR-AUTH-004:** The system SHALL record **login history** including device, IP, user agent, timestamp, and outcome.
- **FR-AUTH-005:** The system SHALL **rate-limit** authentication attempts and lock accounts after a configurable number of failures.
- **FR-AUTH-006:** The system SHALL support password reset via a signed, time-limited link delivered through the notification abstraction.
- **FR-AUTH-007:** Upon login, the system SHALL set the user's `active_branch_id` (home branch by default) and embed it in the session/token claim.
- **FR-AUTH-008:** The system SHALL allow secure logout and token revocation across devices.

### 4.2 Multi-branch tenancy (Tenancy)

**Description/priority:** Row-level branch isolation with controlled cross-branch access. **Priority: Critical.**

**Stimulus/response:** Authenticated user with multi-branch access selects a branch in the switcher → `active_branch_id` updates → all subsequent queries are scoped to that branch.

- **FR-TEN-001:** The system SHALL stamp every operational record with `branch_id` and SHALL auto-filter all reads via the global `BranchScope`.
- **FR-TEN-002:** The system SHALL allow only roles with the `branch.view-all` permission to bypass branch scoping (cross-branch reporting/admin).
- **FR-TEN-003:** The system SHALL allow a user to belong to one home branch and be granted access to additional branches.
- **FR-TEN-004:** The system SHALL provide a **branch switcher** that updates the active branch without re-login for permitted users.
- **FR-TEN-005:** Global reference data (drug master, ICD-10, system settings, roles/permissions) SHALL be exempt from `branch_id` scoping.
- **FR-TEN-006:** The system SHALL prevent cross-branch data writes unless explicitly authorized.

### 4.3 Patient management (Patients)

**Description/priority:** Registration and lifecycle of patient identity and demographics. **Priority: Critical.**

**Stimulus/response:** Receptionist registers a patient → system generates `PAT-YYYY-000001`, stores demographics + next-of-kin → optionally prints a barcoded patient card. Search returns matching patients within the branch (or all branches for permitted roles).

- **FR-PAT-001:** The system SHALL register a patient and generate a unique patient number `PAT-YYYY-000001` via `SequenceService` (never National ID as PK).
- **FR-PAT-002:** The system SHALL capture demographics (name, DOB, sex, contacts, residence), National ID/passport (encrypted), next-of-kin, and known allergies.
- **FR-PAT-003:** The system SHALL expose patients externally via a UUID `public_id` (no sequence leakage).
- **FR-PAT-004:** The system SHALL provide fast patient search by name, patient number, phone, or National ID.
- **FR-PAT-005:** The system SHALL detect potential duplicates at registration and support **record merge** (Records Officer) with full audit and reversible linkage.
- **FR-PAT-006:** The system SHALL attach documents (consent, IDs, referrals) via the storage abstraction and serve them via signed URLs.
- **FR-PAT-007:** The system SHALL **soft-delete** patients only; clinical data SHALL never be hard-deleted (retention).
- **FR-PAT-008:** The system SHALL produce a printable, QR/barcoded patient card.

### 4.4 Appointments (Appointments)

**Description/priority:** Scheduling of patient visits with providers. **Priority: High.**

**Stimulus/response:** Patient (portal) or receptionist books a slot → system checks provider availability → confirms → sends SMS/email reminder. On arrival, the appointment feeds the queue.

- **FR-APT-001:** The system SHALL allow booking, rescheduling, and cancellation of appointments against provider/clinic availability.
- **FR-APT-002:** The system SHALL prevent double-booking of a provider slot.
- **FR-APT-003:** The system SHALL send configurable **reminders** (SMS/email) ahead of appointments via the notification abstraction.
- **FR-APT-004:** The system SHALL support walk-ins (appointment-less visits) that enter the queue directly.
- **FR-APT-005:** On patient arrival/check-in, the system SHALL create a visit and place the patient into the **Reception** queue station.
- **FR-APT-006:** The system SHALL render schedules via FullCalendar with day/week/provider views.

### 4.5 Queue management (Queue)

**Description/priority:** Real-time, branch-aware patient flow across the canonical pipeline. **Priority: Critical.**

**Stimulus/response:** A visit advances `Reception → Triage → Doctor → Lab → Pharmacy → Billing`; each station "calls next," honoring priority and emergency bypass; the queue board updates live for all subscribers.

- **FR-QUE-001:** The system SHALL generate daily, per-department queue tickets `{DEPT}-{NNN}` (e.g. `TRI-014`, `DOC-007`), reset daily.
- **FR-QUE-002:** The system SHALL implement the canonical pipeline `Reception → Triage → Doctor → Lab → Pharmacy → Billing`, with stations **skippable per visit type**.
- **FR-QUE-003:** The system SHALL maintain real-time queue state in **Redis** and broadcast changes over WebSockets.
- **FR-QUE-004:** The system SHALL order each station by **priority** derived from Manchester Triage acuity, supporting **emergency bypass** at every station.
- **FR-QUE-005:** The system SHALL provide "call next," "recall," "hold/return," and "transfer to station" actions with audit.
- **FR-QUE-006:** The system SHALL display a public-safe **queue board** (ticket + station, no PHI) and a staff board (with patient context).
- **FR-QUE-007:** The system SHALL record per-station wait and service times for reporting (§4.13).

### 4.6 Triage (Triage)

**Description/priority:** Acuity assignment using the Manchester Triage System. **Priority: Critical.**

**Stimulus/response:** Nurse records vitals and presenting complaint → selects MTS discriminator → system assigns acuity band → queue priority and target time update accordingly.

- **FR-TRI-001:** The system SHALL capture vitals (BP, pulse, temperature, SpO₂, respiratory rate, weight, height/BMI, pain score).
- **FR-TRI-002:** The system SHALL assign one Manchester Triage band — **Red** (immediate), **Orange** (≤10 min), **Yellow** (≤60 min), **Green** (≤120 min), **Blue** (≤240 min).
- **FR-TRI-003:** The assigned band SHALL drive queue priority and emergency bypass (links FR-QUE-004).
- **FR-TRI-004:** The system SHALL flag breaches of the band's target time on dashboards.
- **FR-TRI-005:** Triage records SHALL attach to the visit and be visible in the EMR.

### 4.7 Electronic Medical Record (EMR)

**Description/priority:** Clinical documentation, diagnoses, and orders. **Priority: Critical.**

**Stimulus/response:** Doctor opens the visit → reviews history/triage/alerts → writes a **SOAP** note → records ICD-10 diagnoses → places lab/radiology/pharmacy orders → the queue routes the patient onward.

- **FR-EMR-001:** The system SHALL provide a longitudinal patient record aggregating visits, notes, diagnoses, results, prescriptions, and documents.
- **FR-EMR-002:** The system SHALL capture clinical notes in **SOAP** structure.
- **FR-EMR-003:** The system SHALL record diagnoses coded to **ICD-10** (global reference data).
- **FR-EMR-004:** The system SHALL maintain a patient **problem list**, **allergy list**, and **medication history**.
- **FR-EMR-005:** The system SHALL allow placing laboratory, radiology, and pharmacy **orders** from the consultation, each generating the appropriate downstream record and queue routing.
- **FR-EMR-006:** The system SHALL surface **clinical alerts** (§4.8) inline at the point of ordering/prescribing.
- **FR-EMR-007:** EMR entries SHALL be **immutable once finalized**; corrections SHALL be addenda with full authorship and timestamp audit (never destructive edits).
- **FR-EMR-008:** Sensitive clinical fields SHALL use encrypted casts at rest.

### 4.8 Clinical alerts (ClinicalAlerts)

**Description/priority:** Patient-safety alerting. **Priority: Critical.**

**Stimulus/response:** When a drug is prescribed/dispensed or an order placed, the system evaluates allergies, interactions, duplicates, and contraindications → raises blocking or warning alerts requiring acknowledgement/override with reason.

- **FR-ALERT-001:** The system SHALL check prescriptions against the patient's recorded **allergies** and raise an alert on conflict.
- **FR-ALERT-002:** The system SHALL check **drug–drug interactions** using a curated local dataset (authoritative), optionally enriched by OpenFDA.
- **FR-ALERT-003:** The system SHALL flag **duplicate therapy** and dose-range concerns where data permits.
- **FR-ALERT-004:** Alerts SHALL be classified as **blocking** (hard stop) or **warning** (override-with-reason); overrides SHALL be audited with prescriber and rationale.
- **FR-ALERT-005:** The system SHALL continue to function safely if OpenFDA is unavailable (graceful degradation to local dataset).

### 4.9 Pharmacy (Pharmacy)

**Description/priority:** Prescription and dispensing workflow. **Priority: Critical.**

**Stimulus/response:** Pharmacist scans/opens an `RX-…` (QR) → verifies safety alerts → dispenses → stock decrements → patient routed to Billing → SMS notification optional.

- **FR-RX-001:** The system SHALL create prescriptions numbered `RX-{BRANCH}-YYYY-000001` and render a **QR code** on the printed prescription.
- **FR-RX-002:** The pharmacist SHALL retrieve a prescription by QR scan (device camera) or manual entry.
- **FR-RX-003:** The system SHALL run clinical alert checks (§4.8) before dispensing.
- **FR-RX-004:** On dispense, the system SHALL **decrement inventory** (FIFO by expiry) and record batch/lot and quantity.
- **FR-RX-005:** The system SHALL support partial dispensing, substitutions (with reason), and refusal-to-dispense with audit.
- **FR-RX-006:** Dispensing SHALL generate billable charges feeding Billing.
- **FR-RX-007:** The system SHALL prevent dispensing of expired or insufficient stock and warn on low stock.

### 4.10 Laboratory (Laboratory)

**Description/priority:** Lab test ordering, sample tracking, and result reporting. **Priority: High.**

**Stimulus/response:** Doctor orders tests → system creates a barcoded sample `LAB-…` → technician collects/scans, enters results → verifier approves → results post to EMR and trigger notification.

- **FR-LAB-001:** The system SHALL accept lab orders and generate barcoded sample IDs `LAB-{BRANCH}-YYMMDD-0001`.
- **FR-LAB-002:** The system SHALL track sample state (ordered → collected → in-process → resulted → verified).
- **FR-LAB-003:** The system SHALL capture results against a test catalog with reference ranges and **flag abnormal/critical** values.
- **FR-LAB-004:** Results SHALL require **verification** before release to the EMR/patient.
- **FR-LAB-005:** Verified results SHALL post to the EMR, notify the ordering provider, and be visible to the patient portal per policy.
- **FR-LAB-006:** Lab tests SHALL generate billable charges.

### 4.11 Radiology (Radiology)

**Description/priority:** Imaging study ordering and reporting. **Priority: Medium-High.**

**Stimulus/response:** Doctor orders a study → system creates `RAD-…` → radiologist captures findings and attaches report/image references → report posts to EMR.

- **FR-RAD-001:** The system SHALL accept radiology orders and generate study IDs `RAD-{BRANCH}-YYMMDD-0001`.
- **FR-RAD-002:** The system SHALL allow the radiologist to record structured findings and **attach report files/image references** via the storage abstraction (signed URLs).
- **FR-RAD-003:** Finalized reports SHALL post to the EMR and notify the ordering provider.
- **FR-RAD-004:** Radiology studies SHALL generate billable charges.

### 4.12 Billing & payments (Billing)

**Description/priority:** Charge capture, invoicing, and payment collection. **Priority: Critical.**

**Stimulus/response:** Charges accrue from services → cashier generates an invoice `INV-…` → collects payment (M-Pesa STK/Paybill/Till or cash) → issues receipt `RCP-…` → optional SHA split.

- **FR-BIL-001:** The system SHALL aggregate charges from consultations, pharmacy, lab, radiology, and inpatient into a patient invoice `INV-{BRANCH}-YYYY-000001`.
- **FR-BIL-002:** All monetary amounts SHALL be stored as `DECIMAL(12,2)` in `KES`; floats SHALL NOT be used.
- **FR-BIL-003:** The system SHALL initiate **M-Pesa STK Push** and accept Paybill/Till and cash payments, recording the payment method and reference.
- **FR-BIL-004:** Daraja callbacks SHALL be processed idempotently (FR-MPESA via §3.3.2) and reconciled against pending invoices.
- **FR-BIL-005:** On successful payment, the system SHALL issue a receipt `RCP-{BRANCH}-YYYY-000001` and mark invoice balance accordingly.
- **FR-BIL-006:** The system SHALL support partial payments, **insurance split** (SHA portion vs. patient co-pay), discounts/waivers (authorized), and refunds (audited).
- **FR-BIL-007:** The system SHALL produce printable invoices/receipts (localized en/sw) via PDF/HTML templates.

### 4.13 Insurance — SHA (Insurance)

**Description/priority:** Eligibility, pre-authorization, and claims to SHA. **Priority: High.**

**Stimulus/response:** At registration/billing, system verifies SHA eligibility → obtains pre-authorization where required → submits a claim `CLM-…` → tracks status to settlement.

- **FR-INS-001:** The system SHALL verify member **eligibility** with SHA via `ShaGateway`.
- **FR-INS-002:** The system SHALL request and store **pre-authorizations** where required for services.
- **FR-INS-003:** The system SHALL compile and submit **claims** numbered `CLM-{BRANCH}-YYYY-00001` with required diagnoses (ICD-10) and itemized charges.
- **FR-INS-004:** The system SHALL **track claim status** (submitted, queried, approved, rejected, paid) with audit and retry on transient errors.
- **FR-INS-005:** The insurer integration SHALL be abstracted to permit future insurers without feature-code changes.

### 4.14 Inpatient (Inpatient)

**Description/priority:** Admission to discharge management. **Priority: High.**

**Stimulus/response:** Doctor admits a patient → system assigns `ADM-…`, allocates ward/bed → nurses record rounds/medication administration → discharge generates summary and final bill.

- **FR-IP-001:** The system SHALL admit patients with admission numbers `ADM-{BRANCH}-YYYY-00001` and allocate ward/bed.
- **FR-IP-002:** The system SHALL track bed/ward occupancy and prevent double allocation.
- **FR-IP-003:** The system SHALL record ward rounds, nursing notes, vitals, and **medication administration** during admission.
- **FR-IP-004:** Inpatient services SHALL accrue daily charges (bed, procedures, drugs, consumables) to the invoice.
- **FR-IP-005:** The system SHALL produce a **discharge summary** and finalize billing/insurance at discharge.

### 4.15 Inventory (Inventory)

**Description/priority:** Stock control for drugs and consumables. **Priority: High.**

**Stimulus/response:** Stock manager raises a PO `PO-…` → receives goods (GRN) → stock increments by batch/expiry → dispensing/usage decrements → reorder and expiry alerts fire.

- **FR-INV-001:** The system SHALL maintain a drug/consumable catalog (global master) and per-branch stock by batch/lot and expiry.
- **FR-INV-002:** The system SHALL create purchase orders `PO-{BRANCH}-YYYY-0001` and record **Goods Received Notes (GRN)** that increment stock.
- **FR-INV-003:** The system SHALL decrement stock on pharmacy dispensing and inpatient/clinical consumption (FIFO by expiry).
- **FR-INV-004:** The system SHALL raise **reorder-level** and **expiry** alerts and block dispensing of expired stock.
- **FR-INV-005:** The system SHALL support stock transfers between branches with audit.
- **FR-INV-006:** The system SHALL support stock takes/adjustments with reason and authorization.

### 4.16 Reporting & analytics (Reporting)

**Description/priority:** Operational, clinical, and financial insight. **Priority: High.**

**Stimulus/response:** Authorized user selects a report and filters (date range, branch) → system computes metrics → renders dashboards/exports.

- **FR-REP-001:** The system SHALL provide operational reports: patient volumes, queue wait/service times, triage band distribution, no-shows.
- **FR-REP-002:** The system SHALL provide financial reports: revenue, payment-method mix, outstanding balances, insurance claim status.
- **FR-REP-003:** The system SHALL provide clinical/inventory reports: top diagnoses, prescribing patterns, stock levels, expiries.
- **FR-REP-004:** Users with `branch.view-all` SHALL access **cross-branch consolidated** reports; others are restricted to their branch(es).
- **FR-REP-005:** The system SHALL support export (CSV/PDF) of reports, localized en/sw, with date/money formatting per DC-4.
- **FR-REP-006:** Dashboards SHALL render via Recharts and respect RBAC.

### 4.17 Communication (Communication)

**Description/priority:** Outbound notifications and reminders. **Priority: Medium-High.**

**Stimulus/response:** A domain event (appointment booked, result ready, payment received) fires → a queued notification is dispatched via the configured SMS/email provider → delivery status is recorded.

- **FR-COM-001:** The system SHALL send notifications only via `NotificationChannelManager` (SMS = Africa's Talking; email = Mailgun/Resend).
- **FR-COM-002:** Notifications SHALL be **queued** (Redis) and retried on failure with backoff.
- **FR-COM-003:** The system SHALL localize message content (en/sw) per recipient preference.
- **FR-COM-004:** The system SHALL record delivery status from provider webhooks and expose a notification log.
- **FR-COM-005:** Patients SHALL be able to set notification preferences/opt-out where lawful.

### 4.18 Patient portal (PatientPortal)

**Description/priority:** Patient self-service. **Priority: Medium-High.**

**Stimulus/response:** Patient logs into the portal/PWA → views appointments, results, prescriptions, invoices → books/cancels appointments → pays invoices via M-Pesa.

- **FR-PORT-001:** The portal SHALL allow patients to view their appointments and **book/reschedule/cancel** within policy.
- **FR-PORT-002:** The portal SHALL allow patients to view **released** lab/radiology results, prescriptions, and invoices.
- **FR-PORT-003:** The portal SHALL allow patients to **pay invoices** via M-Pesa STK Push.
- **FR-PORT-004:** The portal SHALL restrict each patient strictly to their own records (ownership enforcement + audit).
- **FR-PORT-005:** The portal SHALL be a PWA with offline read of cached data and en/sw localization.

### 4.19 Documents (Documents)

**Description/priority:** Secure clinical/administrative file storage. **Priority: High.**

**Stimulus/response:** A user uploads a file → `DocumentService` stores it via the active driver → retrieval is via a time-limited signed URL.

- **FR-DOC-001:** The system SHALL store documents via the storage abstraction (`local`/`s3`/`r2`/`b2`), never referencing a concrete provider in feature code.
- **FR-DOC-002:** All documents SHALL be retrieved through **time-limited signed URLs**; no public buckets.
- **FR-DOC-003:** Document access SHALL be RBAC-checked, branch-scoped, and audited as PHI access where applicable.
- **FR-DOC-004:** Documents SHALL be soft-deleted/archived only, honoring retention.

### 4.20 Audit & compliance (Audit)

**Description/priority:** Immutable accountability trail. **Priority: Critical.**

**Stimulus/response:** Any model change or PHI/security event → an audit entry is written; the dedicated `audit_logs` store is append-only.

- **FR-AUD-001:** The system SHALL log model changes via Spatie Activity Log (who, what, before/after, when).
- **FR-AUD-002:** The system SHALL write a dedicated **immutable** `audit_logs` entry for security and **PHI-access** events (record viewed, exported, printed).
- **FR-AUD-003:** Audit logs SHALL NOT be editable or deletable through the application.
- **FR-AUD-004:** The system SHALL provide audit search/export for authorized compliance roles.
- **FR-AUD-005:** Privileged overrides (alert overrides, waivers, merges, refunds) SHALL be specially flagged in audit.

### 4.21 Administration (Admin)

**Description/priority:** System and tenant configuration. **Priority: High.**

**Stimulus/response:** Hospital Admin manages branches, users, roles/permissions, sequences, and settings.

- **FR-ADM-001:** The system SHALL allow management of **branches** (code, name, address, phone, timezone, is_active).
- **FR-ADM-002:** The system SHALL allow management of **users**, their home/additional branches, roles, and MFA status.
- **FR-ADM-003:** The system SHALL allow management of **roles and permissions** (Spatie), named `{module}.{action}`.
- **FR-ADM-004:** The system SHALL expose **system settings** (notification provider, storage driver, payment shortcodes, retention parameters) as configuration, not code.
- **FR-ADM-005:** The system SHALL allow inspection (not arbitrary editing) of the `sequences` table; mutation occurs only via `SequenceService`.
- **FR-ADM-006:** Administrative actions SHALL be fully audited.

---

## 5. Nonfunctional requirements

### 5.1 Performance requirements

- **NFR-PERF-001:** Interactive REST endpoints SHALL respond within **≤300 ms p95** and **≤800 ms p99** under nominal load (1,000 concurrent users), excluding third-party callouts.
- **NFR-PERF-002:** Queue board WebSocket updates SHALL propagate to subscribed clients within **≤1 s** of a state change.
- **NFR-PERF-003:** Patient and catalog search SHALL return first results within **≤500 ms** for datasets up to 1,000,000 patients (indexed search).
- **NFR-PERF-004:** Report generation SHALL run asynchronously (queued) when exceeding **3 s**, returning a downloadable artifact on completion.
- **NFR-PERF-005:** Heavy/read-mostly data (catalogs, dashboards) SHALL be cached in Redis with explicit invalidation.
- **NFR-PERF-006:** External-provider calls (Daraja, SHA, OpenFDA, SMS/email) SHALL be performed on **queued jobs** with timeouts and SHALL NOT block interactive request threads.

### 5.2 Security requirements

- **NFR-SEC-001:** Authentication SHALL use Laravel Sanctum; MFA (TOTP) SHALL be enforced for `hospital-admin`, `doctor`, `pharmacist`.
- **NFR-SEC-002:** All sensitive columns (National ID, sensitive clinical fields) SHALL use **encrypted casts**; production DB/volumes SHALL be encrypted at rest.
- **NFR-SEC-003:** All traffic SHALL be over **TLS 1.2+**; secure headers (HSTS, CSP, X-Frame-Options) SHALL be set.
- **NFR-SEC-004:** The system SHALL enforce **RBAC** on every endpoint and resource (deny by default), with branch scoping.
- **NFR-SEC-005:** The system SHALL apply CSRF protection, **rate limiting**, input validation (FormRequests), and output encoding to mitigate OWASP Top 10.
- **NFR-SEC-006:** Clinical files SHALL be served only via **time-limited signed URLs**; no public storage.
- **NFR-SEC-007:** Webhooks SHALL be signature-verified and idempotent.
- **NFR-SEC-008:** All PHI access and security events SHALL be auditable and immutable (§4.20).
- **NFR-SEC-009:** Secrets SHALL be held in environment/secret stores, never in source control.

### 5.3 Availability & reliability

- **NFR-AVL-001:** The system SHALL target **≥99.5%** monthly availability for core clinical functions.
- **NFR-AVL-002:** The PWA SHALL provide an **offline read shell** with background sync of queued writes during connectivity loss (Foundation §10).
- **NFR-AVL-003:** Backups SHALL meet **RPO ≤ 1 hour** and **RTO ≤ 4 hours** for the primary datastore.
- **NFR-AVL-004:** External-provider failures SHALL degrade gracefully (retry/queue) without data loss; payments and claims SHALL be reconcilable after outages.
- **NFR-AVL-005:** Queued jobs SHALL be idempotent and survive worker restarts (durable Redis/queue).

### 5.4 Scalability

- **NFR-SCL-001:** The architecture SHALL scale from ~1,000 to **10,000+** users by **horizontal scaling** of stateless app containers behind a load balancer (sessions/state in Redis).
- **NFR-SCL-002:** The system SHALL support read scaling via caching and (future) MySQL read replicas without application redesign.
- **NFR-SCL-003:** Queue workers SHALL scale independently of web nodes.
- **NFR-SCL-004:** Multi-branch growth SHALL be supported by row-level isolation without per-tenant schema duplication.

### 5.5 Maintainability & portability

- **NFR-MNT-001:** The codebase SHALL follow the canonical layering and patterns (DC-2) so modules are independently testable.
- **NFR-MNT-002:** Test coverage SHALL be **≥80%** (Pest/PHPUnit backend; Vitest/RTL/Playwright frontend) and enforced in CI.
- **NFR-MNT-003:** Code SHALL conform to PSR-12/Pint (PHP) and ESLint/Prettier strict, no `any` (TS); Conventional Commits with pre-commit gates.
- **NFR-MNT-004:** All provider integrations SHALL be swappable via configuration (storage, notifications, payments, insurer) with no feature-code changes.
- **NFR-MNT-005:** The system SHALL be deployable via Docker Compose locally and in cloud environments from the same images/config.
- **NFR-MNT-006:** The REST API SHALL be **versioned** to permit non-breaking evolution.

### 5.6 Compliance & legal (KDPA 2019 and Kenyan health law)

- **NFR-CMP-001:** The system SHALL comply with the **Kenya Data Protection Act, 2019**: lawful basis, purpose limitation, data minimization, and consent capture where required.
- **NFR-CMP-002:** The system SHALL support **data-subject rights** — access, rectification, and a controlled erasure/restriction workflow that respects the mandatory clinical-record retention obligation.
- **NFR-CMP-003:** The system SHALL log and control **PHI access** and cross-border data flows; storage region SHALL be configurable to keep data within permitted jurisdictions.
- **NFR-CMP-004:** The system SHALL support **breach detection/notification** evidence via immutable audit and access logs.
- **NFR-CMP-005:** The system SHALL align with MOH requirements and HIPAA-style safeguards where practical, and SHALL retain medical records for **≥10 years** (§6).
- **NFR-CMP-006:** Consent and privacy notices SHALL be presented in **en/sw**.

---

## 6. Other requirements

### 6.1 Data retention & archival

- **OR-RET-001:** Clinical/medical records SHALL be retained for **≥10 years**; clinical data SHALL **never be hard-deleted** (soft-delete + archival), per Foundation §11.
- **OR-RET-002:** The system SHALL support archival of aged records to lower-cost storage while preserving retrievability and audit linkage.
- **OR-RET-003:** Retention periods SHALL be configurable (with a floor of 10 years for clinical data) and SHALL be enforced before any purge of non-clinical data.
- **OR-RET-004:** Audit logs SHALL be retained at least as long as the records they describe.

### 6.2 Internationalization & localization

- **OR-I18N-001:** All user-facing content (UI, emails, SMS, PDFs) SHALL be available in **English (`en`)** and **Kiswahili (`sw`)** via react-i18next (frontend) and localized templates (backend).
- **OR-I18N-002:** There SHALL be **no hardcoded user-facing strings**; all strings live in i18n namespaces.
- **OR-I18N-003:** Dates/times SHALL display in `Africa/Nairobi` (UTC+3) from UTC storage; currency SHALL display as `KES` with two decimals.
- **OR-I18N-004:** Locale SHALL be selectable per user and remembered (preference + persisted UI state).

### 6.3 Standards & conventions

- **OR-STD-001:** Identifiers, money, and timestamp formats SHALL strictly follow Foundation §3.
- **OR-STD-002:** Clinical coding SHALL use ICD-10; triage SHALL use the Manchester Triage System bands.
- **OR-STD-003:** Iconography SHALL use the centralized SVG registry; **emojis SHALL NOT** appear in any UI or content.

### 6.4 Installation & configuration

- **OR-CFG-001:** A branch SHALL be fully operable after configuring its master data (code, sequences, shortcodes, printers) without code changes.
- **OR-CFG-002:** Provider selection (storage/notifications/payments/insurer) SHALL be environment/config-driven.

---

## Appendix A — Requirement traceability summary

| Module | Feature § | FR ID range |
|---|---|---|
| Auth | 4.1 | FR-AUTH-001..008 |
| Tenancy | 4.2 | FR-TEN-001..006 |
| Patients | 4.3 | FR-PAT-001..008 |
| Appointments | 4.4 | FR-APT-001..006 |
| Queue | 4.5 | FR-QUE-001..007 |
| Triage | 4.6 | FR-TRI-001..005 |
| EMR | 4.7 | FR-EMR-001..008 |
| ClinicalAlerts | 4.8 | FR-ALERT-001..005 |
| Pharmacy | 4.9 | FR-RX-001..007 |
| Laboratory | 4.10 | FR-LAB-001..006 |
| Radiology | 4.11 | FR-RAD-001..004 |
| Billing | 4.12 | FR-BIL-001..007 |
| Insurance (SHA) | 4.13 | FR-INS-001..005 |
| Inpatient | 4.14 | FR-IP-001..005 |
| Inventory | 4.15 | FR-INV-001..006 |
| Reporting | 4.16 | FR-REP-001..006 |
| Communication | 4.17 | FR-COM-001..005 |
| PatientPortal | 4.18 | FR-PORT-001..005 |
| Documents | 4.19 | FR-DOC-001..004 |
| Audit | 4.20 | FR-AUD-001..005 |
| Admin | 4.21 | FR-ADM-001..006 |
| Nonfunctional | 5 | NFR-PERF/SEC/AVL/SCL/MNT/CMP-* |
| Other | 6 | OR-RET/I18N/STD/CFG-* |

## Appendix B — Analysis models

**B.1 Visit state model (queue pipeline):**

```
[Registered] → [Reception] → [Triage(MTS band)] → [Doctor]
     ↘ (walk-in)                 ↘ emergency bypass ↗
           → [Lab] ⇄ [Radiology] → [Doctor review] → [Pharmacy] → [Billing] → [Closed/Discharged]
   (stations skippable per visit type; priority + emergency bypass honored at every station)
```

**B.2 Payment reconciliation (M-Pesa):**

```
Invoice(pending) → STK Push → [Daraja] → signed webhook (idempotent by CheckoutRequestID/mpesa_receipt)
  → Payment recorded → Receipt(RCP-…) issued → Invoice balance updated
  (timeout → status query/reconciliation job)
```

**B.3 Claim lifecycle (SHA):**

```
Eligibility → (Pre-auth if required) → Claim(CLM-…) submitted
  → tracked: submitted → queried → approved/rejected → paid (audited, retried on transient failure)
```

---

*End of SRS. Subordinate to `00-foundation.md`; on any conflict, the Foundation document governs.*

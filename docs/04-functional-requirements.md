# 04 — Functional Requirements

> **Authority:** Subordinate to `00-foundation.md`. All constants (identifiers, roles, tenancy rule, queue pipeline, triage standard, abstractions) are inherited from Foundation and **not** re-litigated here.
> **Scope:** Exhaustive, granular functional requirements for every module of Afya HMS. Every user-facing action (button, menu item, state transition, automated job) maps to at least one numbered requirement.
>
> **Product:** Afya HMS · **Document version:** 1.0 · **Status:** MVP baseline

---

## How to read this document

- **ID** — `FR-{MOD}-NNN`. `MOD` codes are fixed (see index). IDs are stable and never reused.
- **Priority (MoSCoW)** — **M** = Must (MVP-blocking), **S** = Should (high value, MVP if time permits), **C** = Could (nice-to-have), **W** = Won't (this release; recorded for traceability).
- **Role(s)** — canonical role slugs from Foundation §5. `system` = automated/background actor. `any-auth` = any authenticated user with the relevant permission.
- **Acceptance criteria** — testable, Gherkin-flavored where useful. A requirement is "done" only when its criteria pass automated/feature tests.

### Module index

| Code | Module | Section |
|---|---|---|
| `AUTH` | Authentication, MFA, Sessions | 1 |
| `TEN` | Tenancy & Branches | 2 |
| `PAT` | Patients | 3 |
| `APPT` | Appointments | 4 |
| `QUE` | Queue | 5 |
| `TRI` | Triage (MTS) | 6 |
| `EMR` | EMR / SOAP | 7 |
| `ALERT` | Clinical Alerts Engine | 8 |
| `PHA` | Pharmacy | 9 |
| `LAB` | Laboratory | 10 |
| `RAD` | Radiology | 11 |
| `BILL` | Billing & M-Pesa | 12 |
| `SHA` | SHA / Insurance | 13 |
| `IPD` | Inpatient / Wards / Beds | 14 |
| `INV` | Inventory (hospital + pharmacy) | 15 |
| `RPT` | Reporting & Dashboards | 16 |
| `COMM` | Communication | 17 |
| `PORT` | Patient Portal | 18 |
| `QR` | QR / Barcode | 19 |
| `AUD` | Audit & Security | 20 |

---

## 1. Authentication, MFA & Sessions (`AUTH`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-AUTH-001 | Email/username + password login issuing a Sanctum SPA token. | M | any-auth | Valid credentials return 200 + token + user profile (roles, permissions, home branch, accessible branches). Invalid → 422 with generic "Invalid credentials" (no user enumeration). |
| FR-AUTH-002 | Password policy: ≥12 chars, upper+lower+digit+symbol, not in common-breach list, ≠ last 5 passwords. | M | any-auth | Non-conforming password rejected at set/change with field-level errors. History of 5 hashes retained. |
| FR-AUTH-003 | Rate limiting + progressive lockout on failed logins (5 fails → 15-min lock per IP+account). | M | system | 6th attempt within window returns 429; audit event written; lock auto-clears after window. |
| FR-AUTH-004 | Mandatory TOTP MFA enrollment for `hospital-admin`, `doctor`, `pharmacist`. | M | hospital-admin, doctor, pharmacist | First login without MFA forces enrollment (QR + secret); cannot reach app until verified. |
| FR-AUTH-005 | Optional TOTP MFA opt-in for all other roles. | S | any-auth | User can enable/disable MFA from profile; disabling requires current OTP + password. |
| FR-AUTH-006 | MFA challenge at login when enabled; 6-digit TOTP, 30s window, ±1 step tolerance. | M | any-auth | Correct OTP completes login; wrong OTP increments fail counter; 5 fails locks per FR-AUTH-003. |
| FR-AUTH-007 | One-time recovery codes (10) generated at MFA enrollment. | M | any-auth | Codes shown once, stored hashed; each usable once; consuming a code is audited; user can regenerate (invalidates old set). |
| FR-AUTH-008 | "Remember this device" trusted-device skip of MFA for 30 days. | S | any-auth | Trusted device fingerprint + signed cookie; revocable from session list; expires after 30 days. |
| FR-AUTH-009 | Logout (current session) revoking the active token. | M | any-auth | Token deleted server-side; subsequent calls 401. |
| FR-AUTH-010 | "Logout everywhere" revoking all tokens/sessions for the user. | S | any-auth | All personal access tokens deleted; all other devices forced to re-auth on next call. |
| FR-AUTH-011 | Idle session timeout (configurable, default 30 min) + absolute max session (default 12 h). | M | system | After idle threshold, next request 401 with `session_expired`; absolute cap forces re-auth regardless of activity. |
| FR-AUTH-012 | Active sessions/devices list with device, IP, location, last-seen; per-session revoke. | S | any-auth | List reflects live tokens; revoking a row invalidates that token immediately. |
| FR-AUTH-013 | Login history (success + failure) with timestamp, IP, device, branch. | M | any-auth, hospital-admin | User sees own history; admin sees all; immutable; retained ≥ 1 year. |
| FR-AUTH-014 | Self-service password change (requires current password + OTP if MFA on). | M | any-auth | On success all *other* sessions revoked; user notified by email. |
| FR-AUTH-015 | Forgot-password via signed, single-use, 60-min-expiry email token. | M | any-auth | Link consumed once; expired/used link → error; reset revokes all sessions + notifies user. |
| FR-AUTH-016 | Admin-forced password reset / account unlock / MFA reset. | M | hospital-admin | Action audited; affected user notified; forced to set new password + re-enroll MFA at next login. |
| FR-AUTH-017 | Configurable password expiry (default 90 days) with grace warnings. | S | system | Expired password forces change at login; user warned 7/3/1 days prior by email. |
| FR-AUTH-018 | Account enable/disable (deactivate without delete). | M | hospital-admin | Disabled user cannot log in (403 `account_disabled`); existing sessions revoked; reversible. |
| FR-AUTH-019 | First-login forced password change for admin-provisioned accounts. | M | any-auth | Temp credential flagged `must_change`; user blocked from app until changed. |
| FR-AUTH-020 | Token includes `active_branch_id` claim consumed by BranchScope. | M | system | Token payload carries active branch; switching branch (FR-TEN-005) reissues/updates claim. |
| FR-AUTH-021 | CSRF + secure cookie + secure headers on SPA auth flow. | M | system | Sanctum CSRF cookie required for stateful requests; security headers present on all responses. |
| FR-AUTH-022 | Step-up re-authentication for sensitive actions (e.g. controlled-drug dispense, refund). | S | doctor, pharmacist, cashier, hospital-admin | Designated actions prompt for password/OTP within last 5 min; otherwise 423 `reauth_required`. |

---

## 2. Tenancy & Branches (`TEN`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-TEN-001 | CRUD branches (code, name, address, phone, timezone, is_active). | M | hospital-admin | Create/edit/deactivate branch; code unique + immutable after first use; deactivation blocks new branch-scoped writes but preserves history. |
| FR-TEN-002 | Row-level isolation: all branch-scoped reads/writes auto-filtered by active branch. | M | system | A user in branch NRB cannot read/write rows of branch MSA via any module endpoint (verified per module). |
| FR-TEN-003 | `branch.view-all` bypass for cross-branch reporting/admin. | M | hospital-admin | Holders can opt into "all branches" view; non-holders never see other branches. |
| FR-TEN-004 | Assign user a home branch + zero-or-more additional accessible branches. | M | hospital-admin | User profile lists accessible branches; access changes take effect on next token refresh. |
| FR-TEN-005 | Branch switcher sets `active_branch_id`. | M | any-auth (multi-branch) | Switching to an accessible branch updates session/token claim; switching to a non-accessible branch → 403. |
| FR-TEN-006 | Global reference data (drug master, ICD-10, settings, roles) excluded from branch scope. | M | system | Reference reads return identical data regardless of active branch. |
| FR-TEN-007 | Per-branch operational settings (working hours, consultation fee defaults, queue prefixes). | S | hospital-admin | Settings resolve branch-first then system-default; editable per branch. |
| FR-TEN-008 | Branch context shown persistently in UI header. | M | any-auth | Active branch name/code visible on every screen; reflects switcher state. |
| FR-TEN-009 | Sequence scopes incorporate branch where defined (invoices, receipts, lab, etc.). | M | system | Generated identifiers embed correct branch code per Foundation §3 formats. |

---

## 3. Patients (`PAT`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-PAT-001 | Register a patient generating `PAT-YYYY-000001`. | M | receptionist, records-officer | On save, unique patient number minted via SequenceService; record visible immediately. |
| FR-PAT-002 | Capture demographics: names, DOB/age, sex, national ID/passport, phone, email, address, county/sub-county. | M | receptionist, records-officer | Required fields enforced; phone validated as Kenyan MSISDN; National ID stored, never used as PK. |
| FR-PAT-003 | Capture next-of-kin / emergency contact (name, relationship, phone). | M | receptionist, records-officer | At least one emergency contact required; phone validated. |
| FR-PAT-004 | Capture insurance details (SHA number, private insurer, member no., scheme). | S | receptionist, records-officer | SHA number format validated; multiple cover entries allowed; primary payer flagged. |
| FR-PAT-005 | Duplicate detection on register (name+DOB, phone, National ID fuzzy match). | M | receptionist, records-officer | Probable duplicates surfaced before commit; user must confirm "new patient" to override. |
| FR-PAT-006 | Edit patient demographics with field-level audit. | M | receptionist, records-officer | Every changed field logged (old→new, actor, time); clinical-relevant fields (DOB, sex) flagged. |
| FR-PAT-007 | Patient search by number, name, phone, National ID, QR scan. | M | any-auth | Sub-second results; partial/fuzzy name match; respects branch scope unless `branch.view-all`. |
| FR-PAT-008 | Patient profile (360°) view: demographics, visits, allergies, problems, meds, results, billing. | M | doctor, nurse, records-officer | Aggregates data from all clinical modules; PHI access audited (FR-AUD-004). |
| FR-PAT-009 | Maintain allergy list (substance, reaction, severity, status). | M | doctor, nurse | Allergies feed the alerts engine (FR-ALERT-001); "No Known Allergies" explicitly recordable. |
| FR-PAT-010 | Maintain problem/diagnosis list (ICD-10 coded, active/resolved). | M | doctor | Problems coded against ICD-10 reference; status togglable; history retained. |
| FR-PAT-011 | Merge duplicate patient records. | S | records-officer, hospital-admin | Merge consolidates visits/results/billing under surviving record; losing number retired (redirects); fully audited; reversible window 24 h. |
| FR-PAT-012 | Upload + view patient documents (ID scan, consent, referrals) via signed URLs. | M | receptionist, records-officer, doctor | Files stored via DocumentService; served only via time-limited signed URLs; type/size validated. |
| FR-PAT-013 | Generate/print/scan patient ID card with QR (`public_id`). | S | receptionist | Card encodes patient `public_id`; scanning resolves to profile (FR-QR-002). |
| FR-PAT-014 | Soft-delete / archive patient (never hard delete; ≥10-year retention). | M | hospital-admin | Record `deleted_at` set, excluded from active lists, retained in DB/archive; clinical data never purged. |
| FR-PAT-015 | VIP / confidentiality flag restricting profile to need-to-know. | C | hospital-admin, doctor | Flagged patients' access further restricted + heightened audit. |
| FR-PAT-016 | Capture patient consent (treatment, data, communication channels). | M | receptionist | Consent records timestamped + versioned; communication consent gates COMM module sends. |
| FR-PAT-017 | Patient-number lookup never exposes sequence externally; external links use `public_id` UUID. | M | system | API responses for shared/portal links use UUID; sequential number not leakable. |

---

## 4. Appointments (`APPT`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-APPT-001 | Book an appointment (patient, provider/department, branch, date/time, reason, type). | M | receptionist, patient | Slot validated against provider availability + no double-book; confirmation persisted. |
| FR-APPT-002 | Provider availability/schedule templates (working hours, slot length, breaks, leave). | M | hospital-admin, doctor | Bookable slots derive from template minus leave/holidays; overrides per provider. |
| FR-APPT-003 | Calendar view (day/week/month, per provider/department) — FullCalendar. | M | receptionist, doctor, nurse | Drag-create + click-to-detail; color-coded by status; branch-scoped. |
| FR-APPT-004 | Reschedule appointment (drag or form) with conflict re-check. | M | receptionist, patient | New slot re-validated; old slot freed; reschedule logged; notification sent. |
| FR-APPT-005 | Cancel appointment with reason + cancellation policy. | M | receptionist, patient | Status → cancelled; slot freed; reason captured; notification sent. |
| FR-APPT-006 | No-show marking + tracking. | S | receptionist | Past unattended appointment markable no-show; counter on patient profile; reportable. |
| FR-APPT-007 | Check-in an appointment → creates/links a visit and enqueues to Reception/Triage. | M | receptionist | Check-in transitions appointment → arrived and pushes ticket into queue pipeline (FR-QUE-001). |
| FR-APPT-008 | Walk-in registration without prior appointment. | M | receptionist | Walk-in creates visit + queue ticket directly; no slot required. |
| FR-APPT-009 | Automated reminders (SMS/email) at configurable lead times (e.g. 24 h, 2 h). | S | system | Reminder dispatched via COMM honoring consent; respects channel config; logged. |
| FR-APPT-010 | Recurring/follow-up appointment creation from an encounter. | C | doctor | Doctor can schedule follow-up from EMR; pre-fills patient/provider; respects availability. |
| FR-APPT-011 | Waitlist for fully-booked providers with auto-offer on cancellation. | C | receptionist | Patients added to waitlist; on cancellation, next waitlisted offered slot + notified. |
| FR-APPT-012 | Appointment statuses: scheduled → confirmed → arrived → in-progress → completed / cancelled / no-show. | M | system | Only valid transitions allowed; each transition timestamped + audited. |
| FR-APPT-013 | Double-booking + overbooking guardrails (configurable per provider). | M | system | Concurrent booking of same slot fails with 409; overbook only if explicitly permitted. |

---

## 5. Queue (`QUE`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-QUE-001 | Generate daily-reset queue ticket `{DEPT}-{NNN}` on entry to a station. | M | system | Ticket number per department resets at local midnight; assigned atomically via SequenceService. |
| FR-QUE-002 | Pipeline routing `Reception → Triage → Doctor → Lab → Pharmacy → Billing`, skippable per visit type. | M | system | Visit advances along configured path; stations skippable per visit-type rules; transitions audited. |
| FR-QUE-003 | Real-time queue board (per station) via WebSockets/Redis. | M | nurse, doctor, receptionist, pharmacist, lab-technician, cashier | Board updates < 2 s after a state change without page refresh; reconnect resumes state. |
| FR-QUE-004 | Priority ordering by MTS triage category + arrival time. | M | system | Red/Orange tickets sort ahead of Yellow/Green/Blue regardless of arrival order; ties broken by arrival. |
| FR-QUE-005 | Emergency bypass injecting a patient to front of any station. | M | nurse, doctor | Emergency flag jumps ticket to top with visual marker; action audited with reason. |
| FR-QUE-006 | "Call next" advancing the station and notifying display/patient. | M | doctor, nurse, lab-technician, pharmacist, cashier | Calling next sets serving status, broadcasts ticket to public display, optionally SMS/announce. |
| FR-QUE-007 | Transfer/re-route a ticket to another station or provider. | M | nurse, doctor | Ticket leaves current station, joins target with preserved priority; both boards update. |
| FR-QUE-008 | Hold / recall a ticket (patient stepped away). | S | nurse, doctor | Held ticket removed from active serving order; recall re-inserts by priority; max-hold timeout configurable. |
| FR-QUE-009 | Mark ticket served/completed at a station. | M | doctor, nurse, lab-technician, pharmacist, cashier | Completion records start/end times; auto-advances to next station per route. |
| FR-QUE-010 | Public-facing display board (now-serving + waiting counts), no PHI. | S | system | Display shows ticket numbers only (no names); auto-refreshes via broadcast. |
| FR-QUE-011 | Queue analytics: wait time, service time, throughput per station/day. | S | hospital-admin | Metrics computed from ticket timestamps; surfaced in Reporting (FR-RPT-005). |
| FR-QUE-012 | Manual re-prioritization / reorder by supervisor. | S | nurse, hospital-admin | Authorized reorder logged with actor + reason; non-authorized denied. |
| FR-QUE-013 | Daily queue reset job + carry-over policy for unfinished tickets. | M | system | At reset, numbering restarts; unclosed tickets either carried-over flagged or closed per policy; audited. |

---

## 6. Triage — Manchester Triage System (`TRI`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-TRI-001 | Record vital signs (BP, HR, RR, SpO₂, temp, weight, height, pain score). | M | nurse | Each vital validated to physiological ranges; out-of-range flagged; BMI auto-computed. |
| FR-TRI-002 | Assign MTS category Red/Orange/Yellow/Green/Blue. | M | nurse | Category required to complete triage; sets queue priority + target time per Foundation §12. |
| FR-TRI-003 | MTS flowchart/discriminator guidance to support category selection. | S | nurse | Selecting a presentational flowchart surfaces discriminators; chosen discriminator recorded with category. |
| FR-TRI-004 | Capture chief complaint + presenting symptoms. | M | nurse | Free-text + optional coded complaint stored on the triage record/visit. |
| FR-TRI-005 | Triage drives target-time SLA + countdown on queue board. | M | system | Each category carries its target (Red immediate … Blue ≤240 min); breach highlighted on board. |
| FR-TRI-006 | Re-triage / category change with reason + audit. | M | nurse | Category change logged old→new with reason; queue re-sorts accordingly. |
| FR-TRI-007 | Trigger emergency bypass directly from triage for Red. | M | nurse | Red assignment auto-offers emergency bypass to Doctor station (FR-QUE-005). |
| FR-TRI-008 | Vitals trend view across visits. | S | doctor, nurse | Historical vitals charted (Recharts) per patient. |
| FR-TRI-009 | Vitals feed clinical alerts (e.g. critical SpO₂/BP). | M | system | Critical vital raises an alert via the engine (FR-ALERT-006). |
| FR-TRI-010 | Allergy/quick-history capture at triage. | S | nurse | Nurse can add allergies during triage feeding FR-PAT-009. |

---

## 7. EMR / SOAP (`EMR`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-EMR-001 | Create a clinical encounter linked to visit/patient/provider/branch. | M | doctor | Encounter opens with patient context, triage vitals, history pre-loaded. |
| FR-EMR-002 | SOAP note: Subjective section. | M | doctor | Free-text + templated; autosaved as draft; required to finalize. |
| FR-EMR-003 | SOAP note: Objective section (exam findings, vitals reference). | M | doctor | Captures exam findings; pulls latest vitals; supports structured fields. |
| FR-EMR-004 | SOAP note: Assessment with ICD-10 diagnosis coding (primary + secondary). | M | doctor | At least one diagnosis required to finalize; ICD-10 searchable; updates problem list (FR-PAT-010). |
| FR-EMR-005 | SOAP note: Plan (orders, prescriptions, referrals, follow-up). | M | doctor | Plan can spawn lab/radiology orders, prescriptions, referrals, follow-up appt without leaving note. |
| FR-EMR-006 | Finalize/sign an encounter (locks note, immutable thereafter). | M | doctor | Signed note read-only; subsequent edits only via addendum (FR-EMR-007); signature + timestamp recorded. |
| FR-EMR-007 | Addendum/amendment to a signed note. | M | doctor | Addendum appended with author/time; original preserved; both visible in history. |
| FR-EMR-008 | Clinical templates per specialty/complaint. | S | doctor, hospital-admin | Admin/doctor manage templates; applying a template pre-fills SOAP fields. |
| FR-EMR-009 | Place lab orders from EMR (single + panel). | M | doctor | Order creates LAB request (FR-LAB-001) linked to encounter; billable item raised. |
| FR-EMR-010 | Place radiology orders from EMR. | M | doctor | Order creates RAD request (FR-RAD-001) linked to encounter; billable item raised. |
| FR-EMR-011 | Create prescriptions from EMR. | M | doctor | Prescription `RX-...` generated (FR-PHA-001); drug interaction/allergy checks run (FR-ALERT-002/003). |
| FR-EMR-012 | View incoming lab/radiology results inline + acknowledge. | M | doctor | Released results appear in encounter; doctor acknowledges; critical results flagged (FR-ALERT-007). |
| FR-EMR-013 | Referral creation (internal department or external facility). | S | doctor | Referral letter generated (PDF) with reason + summary; tracked status. |
| FR-EMR-014 | Sick leave / medical certificate generation. | S | doctor | Certificate PDF with dates + provider signature; numbered + audited. |
| FR-EMR-015 | Full chronological encounter history timeline per patient. | M | doctor, nurse | Timeline aggregates encounters, results, prescriptions; PHI access audited. |
| FR-EMR-016 | Vitals + growth/observation charts in encounter. | S | doctor | Trends rendered (Recharts); pediatric growth charts where age < 18. |
| FR-EMR-017 | Encounter draft autosave + recovery. | M | doctor | Unfinalized note autosaves ≤ 30 s intervals; recoverable after disconnect/PWA offline. |
| FR-EMR-018 | Procedure/notes documentation with consent linkage. | C | doctor | Procedures recorded with linked consent doc; billable. |
| FR-EMR-019 | Read-only EMR access for nursing care delivery. | M | nurse | Nurse sees orders/plan/meds; cannot edit signed clinical assessment. |

---

## 8. Clinical Alerts Engine (`ALERT`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-ALERT-001 | Drug–allergy alert at prescribing/dispensing. | M | doctor, pharmacist | Prescribing a drug matching a recorded allergy raises a blocking alert requiring override + reason. |
| FR-ALERT-002 | Drug–drug interaction alert (severity-graded). | M | doctor, pharmacist | Interacting pair flagged at severity; major interactions block pending override; minor warn. |
| FR-ALERT-003 | Duplicate therapy / therapeutic-class duplication alert. | S | doctor, pharmacist | Same active ingredient/class on active meds warns before adding. |
| FR-ALERT-004 | Dose range / max-dose / pediatric weight-based dosing check. | S | doctor, pharmacist | Out-of-range dose warns; pediatric doses validated against weight. |
| FR-ALERT-005 | Allergy/contraindication alert on lab/radiology orders (e.g. contrast). | C | doctor | Contraindicated order flagged before submission. |
| FR-ALERT-006 | Critical vital-sign alert (configurable thresholds). | M | system, nurse, doctor | Vital beyond critical threshold raises real-time alert to care team; logged. |
| FR-ALERT-007 | Critical lab/radiology result alert with mandatory acknowledgement. | M | system, doctor | Result flagged critical notifies ordering provider; unacknowledged after SLA escalates (FR-ALERT-009). |
| FR-ALERT-008 | Alert override capture (reason mandatory, fully audited). | M | doctor, pharmacist | Every override records actor, reason, timestamp; reportable. |
| FR-ALERT-009 | Escalation of unacknowledged critical alerts. | S | system | Unacknowledged critical alert escalates to backup/supervisor after configurable timeout. |
| FR-ALERT-010 | Configurable alert rules + severity + thresholds by admin. | S | hospital-admin | Rules editable; changes versioned + audited; alert fatigue controls (suppress dup within window). |
| FR-ALERT-011 | Alert center / inbox per clinician with read/ack state. | S | doctor, nurse | Clinician sees active alerts; can acknowledge/dismiss; state persisted. |
| FR-ALERT-012 | Preventive-care / immunization-due reminders. | C | doctor, nurse | Age/condition rules surface due screenings/vaccines on profile. |

---

## 9. Pharmacy (`PHA`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-PHA-001 | Generate prescription `RX-{BRANCH}-YYYY-000001` (QR-coded). | M | doctor | RX number minted; QR encodes `public_id`; items = drug, dose, route, frequency, duration, quantity. |
| FR-PHA-002 | Pharmacist views queued prescriptions for the branch. | M | pharmacist | Prescription queue shows pending RX with priority from queue (FR-QUE-004). |
| FR-PHA-003 | Verify/review prescription with interaction + allergy re-check at dispense. | M | pharmacist | Re-runs FR-ALERT-001/002; pharmacist must resolve alerts before dispensing. |
| FR-PHA-004 | Dispense medication, decrementing pharmacy stock (batch + expiry, FEFO). | M | pharmacist | Dispense reduces correct batch by FEFO; insufficient stock blocks/partials; stock movement logged. |
| FR-PHA-005 | Partial dispense + back-order/owing tracking. | S | pharmacist | Partial quantity recorded; balance owed tracked until fulfilled. |
| FR-PHA-006 | Controlled-substance dispensing with step-up auth + register. | M | pharmacist | Controlled drugs require re-auth (FR-AUTH-022); recorded in controlled register; immutable. |
| FR-PHA-007 | Generate dispensing label + patient instructions (print). | S | pharmacist | Label includes drug, dose, instructions (en/sw), warnings, pharmacy + RX number. |
| FR-PHA-008 | Push dispensed items to billing as charges. | M | system | Dispensed quantities × price post to the visit invoice (FR-BILL-002). |
| FR-PHA-009 | Drug master catalog (global) — generic/brand, form, strength, ATC class. | M | pharmacist, hospital-admin | Catalog is global reference (no branch scope); used by prescribing + dispensing. |
| FR-PHA-010 | Branch-level pharmacy stock per drug (batch, expiry, qty, location, reorder level). | M | pharmacist | Stock is branch-scoped; batch/expiry tracked; reorder level configurable. |
| FR-PHA-011 | Goods receipt (GRN) into pharmacy stock from PO. | M | pharmacist | Receiving against PO increments batches; partial receipt allowed; GRN audited. |
| FR-PHA-012 | Stock adjustment (wastage, breakage, expiry write-off) with reason. | M | pharmacist | Adjustment requires reason + approval threshold; movement logged. |
| FR-PHA-013 | Expiry + low-stock alerts. | M | system, pharmacist | Items below reorder or near expiry (configurable window) raise dashboard + notification alert. |
| FR-PHA-014 | Inter-branch / internal stock transfer. | S | pharmacist | Transfer decrements source, increments destination on receipt; in-transit state tracked; audited. |
| FR-PHA-015 | Return-to-stock / dispense reversal (pre-handover). | S | pharmacist | Reversal restores batch quantity + reverses charge; reason + audit required. |
| FR-PHA-016 | Barcode scan to identify/dispense a drug. | S | pharmacist | Scanning a product barcode resolves the catalog item + batch (FR-QR-004). |
| FR-PHA-017 | Over-the-counter / direct sale without prescription. | S | pharmacist, cashier | OTC sale creates dispense + charge without an RX; non-prescription items only. |

---

## 10. Laboratory (`LAB`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-LAB-001 | Create lab order/request from EMR (single test or panel). | M | doctor | Request links encounter/patient; status `ordered`; billable item raised. |
| FR-LAB-002 | Test catalog with specimen type, container, reference ranges, units, TAT. | M | lab-technician, hospital-admin | Catalog drives ordering + result entry; reference ranges support age/sex variants. |
| FR-LAB-003 | Generate barcoded sample ID `LAB-{BRANCH}-YYMMDD-0001`. | M | lab-technician | Sample ID minted on collection; barcode printable + scannable (FR-QR-003). |
| FR-LAB-004 | Specimen collection recording (collector, time, condition). | M | nurse, lab-technician | Collection sets status `collected`; rejection (haemolysed, insufficient) capturable with reason. |
| FR-LAB-005 | Accession / receive specimen at lab. | M | lab-technician | Scan/receive transitions `received`; mismatch flagged. |
| FR-LAB-006 | Result entry (numeric/text/structured) with auto range-flagging. | M | lab-technician | Values flagged H/L/critical vs reference range; units enforced; draft until verified. |
| FR-LAB-007 | Result verification/validation (two-step where configured). | M | lab-technician | Verifier confirms before release; high-complexity tests require second sign-off. |
| FR-LAB-008 | Release results to ordering provider + portal. | M | lab-technician | Release notifies provider (FR-EMR-012); portal exposure honors release flag (FR-PORT-004). |
| FR-LAB-009 | Critical-value flag + alert on release. | M | system | Critical result triggers FR-ALERT-007 with mandatory provider acknowledgement. |
| FR-LAB-010 | Amend/correct released result with versioned audit. | M | lab-technician | Correction creates new version; original retained; provider re-notified. |
| FR-LAB-011 | Status tracking: ordered → collected → received → in-process → verified → released. | M | system | Only valid transitions; each timestamped + audited; TAT computed. |
| FR-LAB-012 | Worklist / pending-tests dashboard per lab. | M | lab-technician | Branch-scoped worklist with priority + overdue (TAT-breach) highlighting. |
| FR-LAB-013 | Result report PDF (cumulative + single). | S | lab-technician | PDF includes ranges, flags, verifier, accreditation footer; downloadable via signed URL. |
| FR-LAB-014 | External/reference-lab referral for outsourced tests. | C | lab-technician | Outsourced test flagged; external result attachable; tracked separately. |
| FR-LAB-015 | Reagent/consumable consumption linkage to lab inventory. | C | system | Result entry can decrement linked reagent stock (FR-INV). |

---

## 11. Radiology (`RAD`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-RAD-001 | Create radiology order from EMR (modality + study + clinical indication). | M | doctor | Study request links encounter; modality/study from catalog; billable item raised. |
| FR-RAD-002 | Generate study ID `RAD-{BRANCH}-YYMMDD-0001`. | M | system | Study ID minted on scheduling/acquisition; barcoded. |
| FR-RAD-003 | Modality + study catalog (X-ray, US, CT, MRI) with prep instructions. | M | radiologist, hospital-admin | Catalog drives ordering; prep instructions shown to patient/nurse. |
| FR-RAD-004 | Schedule study + acquisition recording. | S | radiologist | Study scheduled to a slot/room; acquisition time + technologist recorded. |
| FR-RAD-005 | Upload images/DICOM or external attachments via signed URLs. | M | radiologist | Image files stored via DocumentService; served via signed URLs only; size/type validated. |
| FR-RAD-006 | Radiology report authoring (findings + impression). | M | radiologist | Structured findings + impression; draft → finalized; templated per modality. |
| FR-RAD-007 | Finalize/sign report (locks; addendum-only edits). | M | radiologist | Signed report immutable; addendum supported; signature + timestamp recorded. |
| FR-RAD-008 | Release report to ordering provider + portal. | M | radiologist | Release notifies provider (FR-EMR-012); critical findings trigger FR-ALERT-007. |
| FR-RAD-009 | Status tracking: ordered → scheduled → acquired → reported → released. | M | system | Valid transitions only; timestamped + audited; TAT computed. |
| FR-RAD-010 | Worklist dashboard per modality. | M | radiologist | Branch-scoped worklist with priority + overdue highlighting. |
| FR-RAD-011 | Contrast/contraindication check on order. | C | system, doctor | Contrast studies trigger allergy/renal contraindication alert (FR-ALERT-005). |
| FR-RAD-012 | Report PDF + image-link sharing via signed URL. | S | radiologist | PDF report downloadable; image links time-limited; portal exposure honors release. |

---

## 12. Billing & M-Pesa (`BILL`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-BILL-001 | Service/price catalog (consultation, procedures, items) per branch. | M | hospital-admin, cashier | Prices resolvable per branch + payer (cash vs insurer); effective-dated. |
| FR-BILL-002 | Auto-charge accumulation to a visit invoice from all modules. | M | system | Lab, radiology, pharmacy, consultation, bed charges post line items to the open invoice automatically. |
| FR-BILL-003 | Generate invoice `INV-{BRANCH}-YYYY-000001`. | M | cashier | Invoice number minted; line items, taxes, discounts, payer split shown; status draft→issued. |
| FR-BILL-004 | Apply discounts/waivers with authorization + reason. | S | cashier, hospital-admin | Discount above threshold requires admin approval; reason captured; audited. |
| FR-BILL-005 | Record cash payment via CashGateway → receipt `RCP-{BRANCH}-YYYY-000001`. | M | cashier | Payment posts to invoice; receipt generated; change computed; printable. |
| FR-BILL-006 | M-Pesa STK Push payment initiation (Daraja). | M | cashier, patient | STK prompt sent to MSISDN; pending state shown; awaits callback (FR-BILL-007). |
| FR-BILL-007 | M-Pesa callback handling, idempotent by `CheckoutRequestID`/`mpesa_receipt`. | M | system | Signed webhook validates + records payment once; duplicate callbacks ignored; invoice updated + receipt issued. |
| FR-BILL-008 | M-Pesa Paybill/Till reconciliation (C2B confirmation matching). | S | cashier, system | Incoming C2B matched to invoice by account ref; unmatched parked for manual reconciliation. |
| FR-BILL-009 | STK timeout/failure handling + retry. | M | system, cashier | No callback within timeout → payment marked failed/expired; cashier may retry; state consistent. |
| FR-BILL-010 | Split payments (cash + M-Pesa + insurance) on one invoice. | S | cashier | Multiple payment lines reconcile to invoice balance; over/under-payment handled. |
| FR-BILL-011 | Insurance/SHA payer split + co-pay computation. | M | cashier | Insured portion routed to claim (FR-SHA-001); patient co-pay billed; balance tracked. |
| FR-BILL-012 | Refund / payment reversal with step-up auth + audit. | M | cashier, hospital-admin | Refund requires re-auth (FR-AUTH-022) + reason; reverses receipt; fully audited. |
| FR-BILL-013 | Invoice + receipt PDF generation. | M | cashier | PDFs branded, numbered, downloadable via signed URL; include payer + balance. |
| FR-BILL-014 | Patient account statement / ledger. | S | cashier, patient | Statement lists invoices, payments, balances over a period; downloadable. |
| FR-BILL-015 | Daily cashier reconciliation / shift cash-up report. | M | cashier, hospital-admin | End-of-shift report totals by method (cash, M-Pesa, insurance); variances flagged. |
| FR-BILL-016 | Outstanding-balance / debtor tracking + payment gate. | S | cashier | Unpaid balances reportable; optional gate before discharge/next service (configurable). |
| FR-BILL-017 | Void/cancel an unpaid invoice with reason. | M | cashier, hospital-admin | Voided invoice excluded from revenue; reason + audit; cannot void paid invoice (refund instead). |
| FR-BILL-018 | Tax handling (VAT where applicable) + exemptions. | S | system | Configurable tax rates per item; exempt items flagged; tax shown on invoice. |

---

## 13. SHA / Insurance (`SHA`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-SHA-001 | Create SHA claim `CLM-{BRANCH}-YYYY-00001` from an insured invoice. | M | cashier, records-officer | Claim number minted; links invoice + patient cover; line items mapped to SHA benefit codes. |
| FR-SHA-002 | SHA member eligibility / cover verification. | M | receptionist, cashier | Verification call via ShaGateway returns active/inactive + scheme; result cached on visit; failure handled gracefully. |
| FR-SHA-003 | Pre-authorization request + tracking. | S | cashier, records-officer | Pre-auth submitted for applicable services; status (pending/approved/declined) tracked; gate billing where required. |
| FR-SHA-004 | Submit claim to SHA via InsurerGateway. | M | cashier, records-officer | Submission returns reference; status `submitted`; payload archived; errors surfaced. |
| FR-SHA-005 | Claim status tracking (draft → submitted → approved/partially-paid/rejected). | M | cashier | Status updates via gateway polling/callback; history retained; valid transitions only. |
| FR-SHA-006 | Claim rejection handling + resubmission. | S | cashier, records-officer | Rejection reason captured; correctable line items; resubmission preserves claim lineage. |
| FR-SHA-007 | Reconcile SHA remittance against claims. | S | cashier, hospital-admin | Paid amounts matched to claims; shortfalls/co-pay variances flagged; patient balance updated. |
| FR-SHA-008 | Attach supporting documents to claim (signed URLs). | M | records-officer | Required docs (referral, results) attached; served via signed URLs; validated. |
| FR-SHA-009 | Benefit/scheme catalog mapping (services → SHA codes). | M | hospital-admin | Mapping maintained centrally; ensures claim line items carry valid codes. |
| FR-SHA-010 | Abstraction allows future private insurers via InsurerGateway. | S | system | Adding a new insurer impl requires no change to claim domain logic (interface honored). |
| FR-SHA-011 | Claims dashboard + aging report. | S | cashier, hospital-admin | Outstanding claims by age/status reportable; revenue-at-risk surfaced. |

---

## 14. Inpatient / Wards / Beds (`IPD`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-IPD-001 | Admit a patient generating `ADM-{BRANCH}-YYYY-00001`. | M | doctor, nurse, receptionist | Admission number minted; links patient/encounter; assigns ward + bed (FR-IPD-003). |
| FR-IPD-002 | Ward + bed master (ward, room, bed, type, daily rate). | M | hospital-admin, nurse | Beds branch-scoped; status (available/occupied/cleaning/blocked); rates feed billing. |
| FR-IPD-003 | Bed allocation + occupancy board. | M | nurse | Real-time bed board; allocating sets bed occupied; conflict (double-allocation) blocked. |
| FR-IPD-004 | Bed transfer between wards/beds with history. | M | nurse, doctor | Transfer frees old bed, occupies new; movement history retained; charges adjust. |
| FR-IPD-005 | Inpatient daily charges (bed fees, nursing) auto-posted. | M | system | Bed-day + service charges accrue to invoice daily until discharge (FR-BILL-002). |
| FR-IPD-006 | Nursing care / observation chart (vitals, intake/output, notes). | M | nurse | Time-stamped observations; trends viewable; feed critical-vital alerts (FR-ALERT-006). |
| FR-IPD-007 | Medication administration record (MAR) / e-MAR. | M | nurse | Scheduled doses listed; administration recorded against prescription; missed/refused captured + audited. |
| FR-IPD-008 | Doctor ward rounds / progress notes. | M | doctor | Daily progress notes per admission; SOAP-style; signed; addendum-only after sign. |
| FR-IPD-009 | Discharge process (summary, instructions, meds, follow-up). | M | doctor | Discharge generates summary PDF; pending balances flagged (FR-BILL-016); bed freed; admission closed. |
| FR-IPD-010 | Discharge against medical advice (DAMA) with consent. | S | doctor, nurse | DAMA captured with risk-acknowledgement consent; audited. |
| FR-IPD-011 | Admission/visit transfer to another branch. | C | hospital-admin, doctor | Inter-branch transfer documents handover; respects tenancy isolation. |
| FR-IPD-012 | Census / occupancy + length-of-stay reporting. | S | hospital-admin, nurse | Occupancy %, ALOS, bed-turnover reportable per ward/branch. |
| FR-IPD-013 | Diet / meal order management. | C | nurse | Diet orders recorded per patient; dietary restrictions flagged. |

---

## 15. Inventory — hospital + pharmacy (`INV`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-INV-001 | Item master (drugs, consumables, reagents, assets) with category + unit. | M | pharmacist, hospital-admin | Items categorized; drugs link to drug master; UoM + pack size defined. |
| FR-INV-002 | Branch-level stock ledger with batch + expiry + location. | M | pharmacist, nurse | Stock branch-scoped; every movement (in/out/adjust/transfer) ledger-recorded + audited. |
| FR-INV-003 | Supplier master + management. | S | hospital-admin | Suppliers CRUD with contacts, lead time, price lists. |
| FR-INV-004 | Purchase order `PO-{BRANCH}-YYYY-0001` creation + approval workflow. | M | pharmacist, hospital-admin | PO minted; approval threshold enforced; status draft→approved→sent→received/closed. |
| FR-INV-005 | Goods Received Note (GRN) against PO. | M | pharmacist | Receiving increments batches; partial/over receipt handled; discrepancy flagged; GRN audited. |
| FR-INV-006 | Stock issue/requisition to departments/wards. | M | pharmacist, nurse | Internal requisition decrements store, increments department stock; approval optional per policy. |
| FR-INV-007 | Stock adjustment / write-off (expiry, damage, count variance). | M | pharmacist | Reason mandatory; threshold approval; movement audited. |
| FR-INV-008 | Stock-take / physical count + variance reconciliation. | S | pharmacist, hospital-admin | Count session compares system vs physical; variances posted as adjustments with sign-off. |
| FR-INV-009 | Reorder-level + low-stock alerts. | M | system, pharmacist | Items at/below reorder raise alert + optional auto-PO suggestion. |
| FR-INV-010 | Expiry tracking + near-expiry alerts (FEFO enforcement). | M | system, pharmacist | Near-expiry (configurable window) alerted; dispensing/issue follows FEFO. |
| FR-INV-011 | Inter-branch stock transfer with in-transit + receipt. | S | pharmacist, hospital-admin | Transfer decrements source, in-transit tracked, increments destination on confirmed receipt; audited. |
| FR-INV-012 | Inventory valuation + movement reports. | S | hospital-admin | Stock value (cost), consumption, turnover reportable per branch/category. |
| FR-INV-013 | Barcode generation + scan for items. | S | pharmacist | Item/batch barcodes printable + scannable for receiving/issue/dispense (FR-QR-004). |
| FR-INV-014 | Asset register for non-consumable equipment. | C | hospital-admin | Assets tracked with location, status, maintenance schedule. |

---

## 16. Reporting & Dashboards (`RPT`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-RPT-001 | Role-aware dashboard landing per role. | M | any-auth | Each role lands on a dashboard scoped to its permissions + active branch; widgets respect RBAC. |
| FR-RPT-002 | Executive/admin KPI dashboard (revenue, patients, occupancy, queues). | M | hospital-admin | Cross-branch when `branch.view-all`; charts via Recharts; date-range filterable. |
| FR-RPT-003 | Financial reports (revenue by service/payer, collections, debtors, M-Pesa vs cash). | M | hospital-admin, cashier | Reports parameterized by branch + period; reconcile to billing ledger; exportable. |
| FR-RPT-004 | Clinical/operational reports (diagnoses ICD-10, prescriptions, lab/radiology volumes). | S | hospital-admin, doctor | Aggregations by period/branch/provider; drill-down to source where permitted. |
| FR-RPT-005 | Queue/throughput + wait-time reports. | S | hospital-admin | Derived from queue timestamps (FR-QUE-011); per station/day; SLA-breach counts. |
| FR-RPT-006 | Pharmacy/inventory reports (consumption, expiry, stock value, reorder). | S | hospital-admin, pharmacist | Pulls from INV ledger; branch-scoped; exportable. |
| FR-RPT-007 | SHA/insurance claims report (submitted, paid, rejected, aging). | S | hospital-admin, cashier | Mirrors FR-SHA-011; revenue-at-risk + reconciliation status. |
| FR-RPT-008 | MOH / regulatory statutory report templates. | S | hospital-admin, records-officer | Configurable statutory report layouts; period-based; exportable for submission. |
| FR-RPT-009 | Export to CSV/Excel/PDF. | M | any-auth (report perm) | Any report exportable; large exports queued + delivered via signed URL/notification. |
| FR-RPT-010 | Scheduled report subscriptions (email delivery). | C | hospital-admin | Reports scheduled (daily/weekly/monthly) emailed to recipients; honors COMM config. |
| FR-RPT-011 | Custom date-range + branch + filter parameters on all reports. | M | any-auth (report perm) | Every report accepts period + branch (within access) + relevant filters; defaults to active branch + today. |
| FR-RPT-012 | Audit/security report (access logs, overrides, failed logins). | S | hospital-admin | Sourced from audit logs (FR-AUD); read-only; exportable. |

---

## 17. Communication (`COMM`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-COMM-001 | Send SMS via NotificationChannelManager (AfricasTalking). | M | system | SMS dispatched through abstraction; provider swappable via config; delivery status recorded. |
| FR-COMM-002 | Send email via configurable provider (Mailgun/Resend). | M | system | Email via abstraction; templated (Blade mail); branded; failures logged + retried. |
| FR-COMM-003 | Consent-gated messaging (respect patient channel consent). | M | system | No message sent on a channel the patient has not consented to; suppression logged. |
| FR-COMM-004 | Appointment reminders + confirmations. | S | system | Triggered by APPT events (FR-APPT-009); content localized (en/sw). |
| FR-COMM-005 | Result-ready / report-ready notifications. | S | system | On lab/radiology release, patient/provider notified per consent + role. |
| FR-COMM-006 | Payment receipt / M-Pesa confirmation messages. | S | system | On successful payment, confirmation sent to patient MSISDN/email. |
| FR-COMM-007 | OTP / security notifications (MFA, password reset, new device). | M | system | Security messages always delivered regardless of marketing consent; templated. |
| FR-COMM-008 | Notification templates (localized en/sw) managed by admin. | S | hospital-admin | Templates editable with variables; localized; versioned. |
| FR-COMM-009 | Bulk/broadcast messaging to patient segments. | C | hospital-admin | Segmented broadcast (e.g. campaign) honors consent; rate-limited; audited. |
| FR-COMM-010 | Delivery status + retry + failure dashboard. | S | hospital-admin | Per-message status (queued/sent/delivered/failed); retries on transient failure; surfaced in dashboard. |
| FR-COMM-011 | In-app notifications (real-time bell) for staff. | S | any-auth | Real-time in-app notifications via broadcast; read/unread state; per-user. |
| FR-COMM-012 | Internal staff messaging / task handoff notes. | C | any-auth | Lightweight internal messages/handoffs between staff; auditable. |

---

## 18. Patient Portal (`PORT`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-PORT-001 | Patient self-registration / portal account activation. | S | patient | Patient activates via invite/OTP; account links to existing patient record (no duplicate); verified contact. |
| FR-PORT-002 | Patient login with optional MFA + own session management. | M | patient | Patient authenticates via Sanctum; can enable MFA; sees only own data. |
| FR-PORT-003 | View upcoming/past appointments + self-book/reschedule/cancel. | S | patient | Booking respects availability (FR-APPT-001/004/005); confined to permitted providers/branches. |
| FR-PORT-004 | View released lab/radiology results + reports. | M | patient | Only released results visible; served via signed URLs; PHI access audited. |
| FR-PORT-005 | View prescriptions + medication list. | S | patient | Active + historical prescriptions visible; QR shown for pharmacy. |
| FR-PORT-006 | View invoices/statements + pay via M-Pesa. | S | patient | Patient sees balances; initiates STK Push (FR-BILL-006); receipt delivered. |
| FR-PORT-007 | Update own demographics/contact (with verification + review). | C | patient | Changes to sensitive fields queued for staff review; contact changes re-verified. |
| FR-PORT-008 | Download documents (results, receipts, certificates) via signed URLs. | S | patient | Downloads time-limited; only own documents; audited. |
| FR-PORT-009 | Manage communication-channel consent + preferences. | M | patient | Patient toggles SMS/email consent; gates COMM sends (FR-COMM-003). |
| FR-PORT-010 | Strict data isolation — patient sees only own PHI. | M | patient, system | Any attempt to access another patient's resource → 403; enforced + audited. |
| FR-PORT-011 | PWA/offline portal shell with cached read data. | C | patient | Portal installable; cached read views available offline; writes queued + background-synced. |

---

## 19. QR / Barcode (`QR`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-QR-001 | Centralized QR/barcode generation service. | M | system | Single service generates codes for patients, RX, lab samples, items; format consistent. |
| FR-QR-002 | Patient QR encodes `public_id` UUID (never sequence). | M | system | Scanning patient QR resolves to profile; sequential number never embedded/leaked. |
| FR-QR-003 | Lab sample + radiology study barcodes. | M | lab-technician, radiologist | Sample/study barcodes printable; scanning resolves the order/specimen for accession/result. |
| FR-QR-004 | Inventory/drug item + batch barcodes. | S | pharmacist | Item/batch barcodes support receiving, issue, dispense scanning. |
| FR-QR-005 | Prescription QR (`RX`) for pharmacy verification. | M | pharmacist | Scanning RX QR opens the prescription for verify/dispense. |
| FR-QR-006 | In-app + hardware scanner input support. | S | any-auth | Scan input via device camera (PWA) or USB/wedge scanner resolves the same entity. |
| FR-QR-007 | Printable labels (patient wristband, sample, dispense, item). | S | nurse, lab-technician, pharmacist | Label layouts printable to standard label printers; include human-readable + code. |
| FR-QR-008 | Scan resolution respects RBAC + branch scope. | M | system | Scanning an entity outside the user's permission/branch → 403; audited. |

---

## 20. Audit & Security (`AUD`)

| ID | Requirement | Priority | Role(s) | Acceptance criteria |
|---|---|---|---|---|
| FR-AUD-001 | Model-change activity log (Spatie Activity Log) on all domain models. | M | system | Create/update/delete records actor, model, changed attributes (old→new), timestamp, branch. |
| FR-AUD-002 | Immutable security/PHI audit log (dedicated append-only store). | M | system | Security + PHI-access events written append-only; no update/delete API; tamper-evident. |
| FR-AUD-003 | Log all authentication events (login, logout, MFA, lockout, reset). | M | system | Every auth event captured with IP, device, outcome; queryable; retained ≥1 year. |
| FR-AUD-004 | Log all PHI access (who viewed which patient record + context). | M | system | Opening a patient profile/result logs viewer, patient, purpose/context, timestamp. |
| FR-AUD-005 | Log clinical overrides (alert overrides, controlled-drug, discounts, refunds). | M | system | Override events record actor, reason, entity; surfaced in audit report (FR-RPT-012). |
| FR-AUD-006 | Encryption at rest for sensitive columns (Laravel encrypted casts). | M | system | Designated PHI/PII columns stored encrypted; decrypt transparent to authorized app code. |
| FR-AUD-007 | TLS in transit + secure headers on all endpoints. | M | system | HTTPS enforced; HSTS + security headers present; mixed-content blocked. |
| FR-AUD-008 | Rate limiting + abuse protection on sensitive endpoints. | M | system | Auth, payment, search endpoints rate-limited; breaches 429 + logged. |
| FR-AUD-009 | Signed, time-limited URLs for all clinical/document file access. | M | system | No public bucket; every file served via expiring signed URL; expiry configurable; access audited. |
| FR-AUD-010 | Data Protection Act 2019 compliance: consent, access, retention. | M | system | Consent captured (FR-PAT-016); patient data-access request fulfillable; retention ≥10y for clinical. |
| FR-AUD-011 | No hard-delete of clinical data (soft-delete + archival). | M | system | Clinical records never physically removed; soft-delete + archive; ≥10-year retention enforced. |
| FR-AUD-012 | Audit-log search/report (admin, read-only). | S | hospital-admin | Admin searches audit by actor/patient/date/event; export per FR-RPT-009; cannot mutate logs. |
| FR-AUD-013 | Suspicious-activity / anomaly flagging (e.g. mass PHI access, off-hours). | C | system, hospital-admin | Configurable rules flag anomalies; alert raised to admin; logged. |
| FR-AUD-014 | Break-the-glass emergency access with mandatory justification. | C | doctor, nurse | Emergency access to restricted record requires justification; heightened audit + post-hoc review. |
| FR-AUD-015 | Per-action authorization enforced server-side (RBAC + ownership + branch). | M | system | Every write/read checks permission + branch scope + (portal) ownership; failures 403 + audited; never client-trusted. |

---

## Traceability notes

- **Roles** referenced are the 10 canonical slugs (Foundation §5); `system` denotes automated actors; `any-auth` denotes any authenticated user holding the relevant `{module}.{action}` permission (full matrix in `08-rbac-matrix.md`).
- **Identifiers** in acceptance criteria follow the canonical formats (Foundation §3) and are minted exclusively by `SequenceService` (Foundation §6).
- **Real-time** requirements rely on Redis + Laravel Broadcasting (Foundation §13); **payments** on the `PaymentGateway`/`MpesaDarajaGateway` abstractions (Foundation §9); **notifications** on `NotificationChannelManager` (Foundation §8); **storage** on `DocumentService`/`StorageManager` with signed URLs (Foundation §7).
- **Non-functional** qualities (performance targets, scalability to 10,000+ users, ≥80% test coverage) are specified separately and constrain every "Must" requirement here.

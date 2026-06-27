# 06 — User Stories (Agile)

> **Consistency note:** This document derives from `00-foundation.md`. All roles, slugs,
> modules, identifiers, and conventions used here are those defined there. If anything
> conflicts with the Foundation, the Foundation wins.

**Product:** Afya HMS · **Context:** Private multi-branch hospital, Kenya
**Document version:** 1.0 · **Status:** MVP backlog baseline

---

## Conventions used in this document

- **ID format:** `US-{MOD}-NNN` where `{MOD}` is the epic/module code (e.g. `AUTH`, `REG`, `EMR`).
- **Story template:** *As a `<role>`, I want `<goal>`, so that `<benefit>`.*
- **Acceptance criteria:** Gherkin **Given / When / Then** (multiple scenarios where useful).
- **Story points (SP):** Modified Fibonacci `1, 2, 3, 5, 8, 13`. Relative effort, not hours.
- **Roles** (canonical slugs from Foundation §5): `hospital-admin`, `doctor`, `nurse`,
  `receptionist`, `records-officer`, `pharmacist`, `lab-technician`, `radiologist`,
  `cashier`, `patient`.

### Epic / module index

| Code | Epic / Module | Backend context |
|---|---|---|
| `AUTH` | Authentication, Sessions & MFA | `Auth` |
| `ADM` | Admin & Branch Management | `Admin`, `Tenancy` |
| `REG` | Patient Registration & Records | `Patients` |
| `APPT` | Appointments & Scheduling | `Appointments` |
| `QUE` | Queue Management | `Queue` |
| `TRI` | Triage (Manchester) | `Triage` |
| `EMR` | Consultation & EMR | `EMR`, `ClinicalAlerts` |
| `RX` | Prescriptions | `Pharmacy` (prescribing) |
| `DISP` | Pharmacy Dispensing | `Pharmacy` (dispense) |
| `LAB` | Laboratory Orders & Results | `Laboratory` |
| `RAD` | Radiology / Imaging | `Radiology` |
| `BILL` | Billing, Payments & M-Pesa | `Billing` |
| `SHA` | SHA Insurance & Claims | `Insurance` |
| `IPD` | Inpatient / Ward Management | `Inpatient` |
| `INV` | Inventory & Procurement | `Inventory` |
| `RPT` | Reporting & Analytics | `Reporting` |
| `PORTAL` | Patient Portal | `PatientPortal` |
| `NOTIF` | Communication & Notifications | `Communication` |
| `AUD` | Audit & Compliance | `Audit` |

---

# Epic AUTH — Authentication, Sessions & MFA

### US-AUTH-001 — Secure login
**As a** user (any role), **I want** to log in with email/username and password, **so that** I can access only the features my role permits.
**Acceptance criteria**
- **Given** valid credentials, **When** I submit the login form, **Then** I receive a Sanctum token and land on my role's default dashboard.
- **Given** invalid credentials, **When** I submit, **Then** I see a generic "invalid credentials" error and no token is issued.
- **Given** 5 failed attempts within 15 minutes, **When** I try again, **Then** the account is rate-limited and a lockout message is shown.
**SP:** 3

### US-AUTH-002 — TOTP MFA enrollment
**As a** `doctor` / `pharmacist` / `hospital-admin`, **I want** to enroll a TOTP authenticator, **so that** my privileged account is protected by a second factor.
**Acceptance criteria**
- **Given** I am a privileged role without MFA, **When** I first log in, **Then** I am forced into MFA enrollment (QR + secret) before reaching the app.
- **Given** I scan the QR and enter a valid 6-digit code, **When** I confirm, **Then** MFA is enabled and 10 one-time recovery codes are generated and shown once.
**SP:** 5

### US-AUTH-003 — MFA challenge at login
**As a** privileged user, **I want** to be challenged for my TOTP code after password, **so that** a stolen password alone cannot grant access.
**Acceptance criteria**
- **Given** MFA is enabled, **When** I pass the password step, **Then** I am prompted for a 6-digit code before a token is issued.
- **Given** a valid TOTP or recovery code, **When** I submit it, **Then** access is granted and a used recovery code is invalidated.
- **Given** an expired/incorrect code, **When** I submit, **Then** access is denied and the attempt is audited.
**SP:** 5

### US-AUTH-004 — Password reset
**As a** user, **I want** to reset a forgotten password via a signed email link, **so that** I can regain access without contacting an admin.
**Acceptance criteria**
- **Given** a registered email, **When** I request a reset, **Then** a time-limited signed link is emailed (and the response does not reveal whether the email exists).
- **Given** a valid link, **When** I set a new password meeting policy, **Then** the password updates and all active sessions are revoked.
**SP:** 3

### US-AUTH-005 — Idle session timeout
**As a** `hospital-admin`, **I want** sessions to expire after configured idle time, **so that** unattended terminals don't leak PHI.
**Acceptance criteria**
- **Given** the configured idle timeout, **When** a user is inactive past it, **Then** the token is invalidated and the next request returns 401.
- **Given** activity within the window, **When** the user acts, **Then** the idle timer resets.
**SP:** 3

### US-AUTH-006 — Password policy & expiry
**As a** `hospital-admin`, **I want** to enforce password complexity and periodic expiry, **so that** weak/stale credentials are eliminated.
**Acceptance criteria**
- **Given** the policy (length, complexity, no reuse of last N), **When** a user sets a password, **Then** non-compliant passwords are rejected with reasons.
- **Given** a password older than the expiry period, **When** the user logs in, **Then** they must change it before continuing.
**SP:** 3

### US-AUTH-007 — Login history & device/IP tracking
**As a** user, **I want** to see my login history with device and IP, **so that** I can spot unauthorized access.
**Acceptance criteria**
- **Given** prior logins, **When** I open security settings, **Then** I see timestamp, IP, device/user-agent, and success/failure for each.
- **Given** a suspicious session, **When** I revoke it, **Then** that session's token is invalidated immediately.
**SP:** 3

### US-AUTH-008 — Branch switcher
**As a** multi-branch user, **I want** to switch my active branch, **so that** I operate on the correct branch's data.
**Acceptance criteria**
- **Given** access to >1 branch, **When** I pick a branch in the switcher, **Then** `active_branch_id` updates in my token/session and all data re-scopes via `BranchScope`.
- **Given** access to only one branch, **When** I log in, **Then** the switcher is hidden and that branch is active.
**SP:** 3

### US-AUTH-009 — Logout & token revocation
**As a** user, **I want** to log out, **so that** my token can no longer be used.
**Acceptance criteria**
- **Given** an active session, **When** I log out, **Then** the current token is revoked and protected requests return 401.
- **Given** "log out everywhere", **When** I confirm, **Then** all my tokens are revoked.
**SP:** 2

### US-AUTH-010 — Forced MFA reset (admin)
**As a** `hospital-admin`, **I want** to reset a user's MFA when their device is lost, **so that** they can re-enroll securely.
**Acceptance criteria**
- **Given** a user lost their authenticator, **When** I reset their MFA, **Then** their MFA is disabled, the action is audited, and they must re-enroll at next login.
**SP:** 2

---

# Epic ADM — Admin & Branch Management

### US-ADM-001 — Create a branch
**As a** `hospital-admin`, **I want** to create a branch with code, name, address, phone, timezone, **so that** operations can be scoped to it.
**Acceptance criteria**
- **Given** a unique branch `code` (e.g. `NRB`), **When** I save, **Then** the branch is created `is_active=true` and becomes selectable.
- **Given** a duplicate code, **When** I save, **Then** validation rejects it.
**SP:** 3

### US-ADM-002 — Activate / deactivate a branch
**As a** `hospital-admin`, **I want** to deactivate a branch, **so that** no new operational records are created there while history is preserved.
**Acceptance criteria**
- **Given** an active branch, **When** I deactivate it, **Then** it disappears from the switcher and new-record flows, but reports still read its history.
**SP:** 2

### US-ADM-003 — Create user accounts
**As a** `hospital-admin`, **I want** to create staff accounts with a home branch and role(s), **so that** staff can access the system with correct permissions.
**Acceptance criteria**
- **Given** name, email, home branch, and role, **When** I create the user, **Then** an account is created and an invite/temporary-password email is sent.
- **Given** a privileged role, **When** the user first logs in, **Then** MFA enrollment is enforced.
**SP:** 5

### US-ADM-004 — Assign roles & permissions
**As a** `hospital-admin`, **I want** to assign Spatie roles/permissions to a user, **so that** access matches their duties.
**Acceptance criteria**
- **Given** the RBAC matrix, **When** I assign a role, **Then** the user inherits that role's permissions immediately on next request.
- **Given** a permission change, **When** saved, **Then** the change is audited with before/after.
**SP:** 5

### US-ADM-005 — Grant multi-branch access
**As a** `hospital-admin`, **I want** to grant a user access to additional branches, **so that** roaming staff can switch branches.
**Acceptance criteria**
- **Given** a user with a home branch, **When** I add branch access, **Then** those branches appear in their switcher.
- **Given** `branch.view-all`, **When** assigned, **Then** the user bypasses `BranchScope` for cross-branch reporting.
**SP:** 3

### US-ADM-006 — Deactivate / suspend a user
**As a** `hospital-admin`, **I want** to suspend a user, **so that** departed or compromised staff lose access immediately.
**Acceptance criteria**
- **Given** an active user, **When** I suspend them, **Then** their tokens are revoked and login is blocked, with the action audited.
**SP:** 2

### US-ADM-007 — Manage system settings
**As a** `hospital-admin`, **I want** to configure global settings (timeouts, password policy, notification providers, storage driver), **so that** the system matches our operating policy.
**Acceptance criteria**
- **Given** a settings change, **When** I save, **Then** it persists and takes effect without code changes, and the change is audited.
- **Given** an invalid value, **When** I save, **Then** validation blocks it.
**SP:** 5

### US-ADM-008 — Manage clinical reference catalogs
**As a** `hospital-admin`, **I want** to manage global catalogs (drug master, ICD-10, lab test catalog, service price list), **so that** clinical and billing flows stay accurate.
**Acceptance criteria**
- **Given** a catalog item, **When** I add/edit/retire it, **Then** the change applies across branches (global reference data, not branch-scoped).
- **Given** an item in use, **When** I retire it, **Then** it is hidden from new selections but preserved on historical records.
**SP:** 5

### US-ADM-009 — Branch-level service pricing
**As a** `hospital-admin`, **I want** to set per-branch prices for services where they differ, **so that** billing reflects local pricing.
**Acceptance criteria**
- **Given** a service with a base price, **When** I set a branch override, **Then** billing in that branch uses the override; otherwise it uses the base price.
**SP:** 3

### US-ADM-010 — Maintenance mode / announcements
**As a** `hospital-admin`, **I want** to post system announcements or enable maintenance mode, **so that** staff are warned of downtime.
**Acceptance criteria**
- **Given** an announcement, **When** I publish it, **Then** active users see a banner until dismissed/expired.
- **Given** maintenance mode on, **When** non-admins access the app, **Then** they see a maintenance page; admins retain access.
**SP:** 2

---

# Epic REG — Patient Registration & Records

### US-REG-001 — Register a new patient
**As a** `receptionist`, **I want** to register a new patient with demographics and contacts, **so that** they get a unique patient number and can be served.
**Acceptance criteria**
- **Given** required demographics (name, DOB/age, sex, phone), **When** I save, **Then** a patient number `PAT-YYYY-000001` is generated via `SequenceService` and a `public_id` UUID is assigned.
- **Given** National ID is provided, **When** I save, **Then** it is stored as an attribute, **never** as the primary key.
- **Given** the patient is registered, **Then** the record is scoped to my active `branch_id`.
**SP:** 5

### US-REG-002 — Duplicate detection on registration
**As a** `records-officer`, **I want** the system to warn of likely duplicates, **so that** we avoid fragmented records.
**Acceptance criteria**
- **Given** matching name + DOB or phone or National ID, **When** I attempt to register, **Then** the system surfaces potential matches before creating a new record.
- **Given** a confirmed match, **When** I choose it, **Then** I continue with the existing patient instead of creating a duplicate.
**SP:** 5

### US-REG-003 — Search for a patient
**As a** `receptionist`, **I want** to search by patient number, name, phone, or National ID, **so that** I can quickly retrieve a record.
**Acceptance criteria**
- **Given** a search term, **When** I search, **Then** matching patients in my branch (or all branches if `branch.view-all`) are listed with key identifiers.
- **Given** no match, **When** I search, **Then** I'm offered to register a new patient.
**SP:** 3

### US-REG-004 — Update patient demographics
**As a** `records-officer`, **I want** to edit patient demographics and contacts, **so that** records stay current.
**Acceptance criteria**
- **Given** an existing patient, **When** I edit and save, **Then** changes persist and are activity-logged (who/when/what).
**SP:** 2

### US-REG-005 — Capture next-of-kin & emergency contact
**As a** `receptionist`, **I want** to record next-of-kin and emergency contacts, **so that** we can reach someone in emergencies.
**Acceptance criteria**
- **Given** a patient, **When** I add a next-of-kin (name, relationship, phone), **Then** it is saved and visible to clinicians.
**SP:** 2

### US-REG-006 — Record insurance / SHA membership
**As a** `receptionist`, **I want** to capture a patient's SHA/insurance membership, **so that** claims can be raised later.
**Acceptance criteria**
- **Given** a patient, **When** I enter SHA number and scheme, **Then** it is stored and flagged for eligibility checks at billing.
**SP:** 3

### US-REG-007 — Upload patient documents
**As a** `records-officer`, **I want** to upload ID/insurance/consent documents, **so that** they're attached to the record.
**Acceptance criteria**
- **Given** a file, **When** I upload it, **Then** it is stored via `DocumentService` and accessible only through time-limited signed URLs.
**SP:** 3

### US-REG-008 — Merge duplicate patient records
**As a** `records-officer`, **I want** to merge two duplicate patients, **so that** clinical history is unified.
**Acceptance criteria**
- **Given** two confirmed duplicates, **When** I merge, **Then** visits, orders, results, and billing consolidate under the surviving record and the merge is audited and reversible-by-record (no hard delete).
**SP:** 8

### US-REG-009 — Capture patient consent
**As a** `receptionist`, **I want** to record data-processing and treatment consent, **so that** we comply with the Data Protection Act 2019.
**Acceptance criteria**
- **Given** a consent form, **When** captured (signed/uploaded), **Then** consent status and timestamp are recorded and surfaced in the patient header.
**SP:** 2

### US-REG-010 — View patient summary header
**As a** `doctor` / `nurse`, **I want** a consistent patient header (allergies, alerts, age, sex, key flags), **so that** I have safety-critical context everywhere.
**Acceptance criteria**
- **Given** any patient-context screen, **When** it loads, **Then** the header shows allergies, active alerts, age/sex, and SHA status prominently.
**SP:** 3

---

# Epic APPT — Appointments & Scheduling

### US-APPT-001 — Book an appointment
**As a** `receptionist`, **I want** to book an appointment with a doctor/department at a time slot, **so that** the patient is scheduled.
**Acceptance criteria**
- **Given** an available slot, **When** I book it, **Then** the appointment is created scoped to branch and the slot is no longer available.
- **Given** a taken slot, **When** I try to double-book, **Then** the system blocks it.
**SP:** 5

### US-APPT-002 — View provider calendar
**As a** `receptionist`, **I want** a FullCalendar view of provider availability, **so that** I can find open slots quickly.
**Acceptance criteria**
- **Given** a provider and date range, **When** I open the calendar, **Then** booked/free slots and blocks are shown for the active branch.
**SP:** 3

### US-APPT-003 — Reschedule an appointment
**As a** `receptionist`, **I want** to reschedule, **so that** patient changes are accommodated.
**Acceptance criteria**
- **Given** an existing appointment, **When** I move it to a free slot, **Then** the old slot frees, the new slot books, and the patient is notified.
**SP:** 3

### US-APPT-004 — Cancel an appointment
**As a** `receptionist`, **I want** to cancel with a reason, **so that** the slot is released and tracked.
**Acceptance criteria**
- **Given** an appointment, **When** I cancel with a reason, **Then** it is marked cancelled, the slot frees, and a notification is sent.
**SP:** 2

### US-APPT-005 — Define provider schedule templates
**As a** `hospital-admin`, **I want** to define recurring availability templates per provider, **so that** bookable slots are generated automatically.
**Acceptance criteria**
- **Given** a weekly template (days, hours, slot length), **When** I save it, **Then** bookable slots are generated and exceptions/holidays can be blocked.
**SP:** 5

### US-APPT-006 — Appointment reminders
**As a** `patient`, **I want** SMS/email reminders before my appointment, **so that** I don't miss it.
**Acceptance criteria**
- **Given** an upcoming appointment, **When** the reminder window arrives, **Then** an SMS/email is sent via the configured `NotificationChannelManager`.
**SP:** 3

### US-APPT-007 — Self-service booking (portal)
**As a** `patient`, **I want** to request/book an appointment from the portal, **so that** I don't need to call.
**Acceptance criteria**
- **Given** published availability, **When** I book a slot, **Then** the appointment is created (or queued for confirmation) and I receive confirmation.
**SP:** 5

### US-APPT-008 — Check-in an arrived patient
**As a** `receptionist`, **I want** to check in an arrived patient against their appointment, **so that** they enter the queue.
**Acceptance criteria**
- **Given** a scheduled patient arrives, **When** I check them in, **Then** a queue ticket is issued and they enter the `Reception → Triage` pipeline.
**SP:** 3

### US-APPT-009 — No-show handling
**As a** `receptionist`, **I want** to mark no-shows, **so that** scheduling metrics and follow-up are accurate.
**Acceptance criteria**
- **Given** an appointment time has passed without check-in, **When** I mark no-show, **Then** it is recorded and counts toward no-show reporting.
**SP:** 2

### US-APPT-010 — Walk-in registration into queue
**As a** `receptionist`, **I want** to handle walk-ins without an appointment, **so that** unscheduled patients are served.
**Acceptance criteria**
- **Given** a walk-in patient, **When** I register/check them in, **Then** a queue ticket is issued and they enter the pipeline by visit type.
**SP:** 2

---

# Epic QUE — Queue Management

### US-QUE-001 — Issue a queue ticket
**As a** `receptionist`, **I want** to issue a per-department daily ticket (`TRI-014`, `DOC-007`), **so that** patients are served in order.
**Acceptance criteria**
- **Given** a patient entering a station, **When** a ticket is issued, **Then** it follows `{DEPT}-{NNN}` with a daily reset and is stored in Redis real-time state.
**SP:** 3

### US-QUE-002 — Real-time queue board
**As a** `nurse` / `doctor`, **I want** a live queue board that updates in real time, **so that** I can call the next patient without refreshing.
**Acceptance criteria**
- **Given** the queue changes, **When** a ticket is added/called/completed, **Then** all subscribed boards update via Redis + Laravel Broadcasting (WebSockets) within ~1s.
**SP:** 5

### US-QUE-003 — Call next patient
**As a** `doctor`, **I want** to call the next patient in my station, **so that** I can start the consultation.
**Acceptance criteria**
- **Given** patients waiting, **When** I call next, **Then** the highest-priority/earliest ticket is marked "called" and announced on the board.
**SP:** 3

### US-QUE-004 — Priority & emergency bypass
**As a** `nurse`, **I want** triage priority and emergency cases to jump the queue, **so that** the sickest are seen first (MTS).
**Acceptance criteria**
- **Given** a Red/Orange triage outcome, **When** the patient enters a station queue, **Then** they are ordered ahead of lower-priority tickets per Foundation §12–13.
- **Given** an emergency bypass, **When** invoked, **Then** the patient is escalated at every downstream station.
**SP:** 5

### US-QUE-005 — Route patient through pipeline
**As a** `nurse`, **I want** to advance a patient along `Reception → Triage → Doctor → Lab → Pharmacy → Billing`, **so that** the journey is tracked.
**Acceptance criteria**
- **Given** the directed pipeline, **When** a station completes, **Then** the patient is routed to the next applicable station (skippable per visit type).
**SP:** 5

### US-QUE-006 — Skip / redirect a station
**As a** `doctor`, **I want** to skip or redirect a patient (e.g. straight to pharmacy), **so that** unnecessary steps are avoided.
**Acceptance criteria**
- **Given** a visit that doesn't need labs, **When** I route the patient, **Then** the lab station is skipped and they proceed to the next needed station.
**SP:** 3

### US-QUE-007 — Public waiting-room display
**As a** `patient`, **I want** to see called ticket numbers on a waiting-room screen, **so that** I know when it's my turn.
**Acceptance criteria**
- **Given** a display screen, **When** a ticket is called, **Then** it shows the ticket and destination room without exposing patient names (privacy).
**SP:** 3

### US-QUE-008 — Re-queue / return to waiting
**As a** `nurse`, **I want** to return a called patient to waiting if absent, **so that** the queue keeps moving.
**Acceptance criteria**
- **Given** a called patient who didn't appear, **When** I re-queue them, **Then** they return to the list (optionally with adjusted position) and the event is logged.
**SP:** 2

### US-QUE-009 — Queue metrics (wait/serve times)
**As a** `hospital-admin`, **I want** wait-time and service-time metrics per station, **so that** I can manage throughput.
**Acceptance criteria**
- **Given** ticket timestamps, **When** I view queue analytics, **Then** average wait, service time, and abandonment are shown per station and branch.
**SP:** 3

### US-QUE-010 — Offline-tolerant queue updates (PWA)
**As a** `nurse`, **I want** queue actions to queue locally when offline and sync when back online, **so that** brief network drops don't stall me.
**Acceptance criteria**
- **Given** a network drop, **When** I act on the queue, **Then** the action is captured by the PWA and background-synced on reconnect without duplication.
**SP:** 5

---

# Epic TRI — Triage (Manchester)

### US-TRI-001 — Record vital signs
**As a** `nurse`, **I want** to capture vitals (BP, pulse, temp, RR, SpO2, weight, height), **so that** clinicians have baseline data.
**Acceptance criteria**
- **Given** a patient at triage, **When** I enter vitals, **Then** they are saved to the visit, time-stamped, and visible in EMR.
- **Given** out-of-range values, **When** entered, **Then** they are flagged visually.
**SP:** 3

### US-TRI-002 — Assign Manchester triage category
**As a** `nurse`, **I want** to assign an MTS category (Red/Orange/Yellow/Green/Blue), **so that** urgency drives queue priority.
**Acceptance criteria**
- **Given** the MTS scale (Foundation §12), **When** I select a category, **Then** the target time (e.g. Orange ≤10 min) is recorded and the queue priority updates.
**SP:** 5

### US-TRI-003 — Capture presenting complaint
**As a** `nurse`, **I want** to record the chief/presenting complaint, **so that** the doctor has context before consultation.
**Acceptance criteria**
- **Given** a triage encounter, **When** I record the complaint, **Then** it is attached to the visit and shown to the doctor.
**SP:** 2

### US-TRI-004 — Allergy & alert capture at triage
**As a** `nurse`, **I want** to confirm/record allergies and clinical alerts, **so that** safety checks fire downstream.
**Acceptance criteria**
- **Given** a stated allergy, **When** I record it, **Then** it appears in the patient header and feeds prescription interaction/allergy checks.
**SP:** 3

### US-TRI-005 — Emergency fast-track
**As a** `nurse`, **I want** to fast-track a Red category patient, **so that** they bypass normal queues immediately.
**Acceptance criteria**
- **Given** a Red triage, **When** I confirm, **Then** the patient is escalated to immediate care and downstream stations honor the bypass.
**SP:** 3

### US-TRI-006 — Re-triage / escalate
**As a** `nurse`, **I want** to re-triage a deteriorating waiting patient, **so that** their priority reflects current condition.
**Acceptance criteria**
- **Given** a patient already triaged, **When** I re-assess and raise the category, **Then** queue order updates and the change is logged with reason.
**SP:** 3

### US-TRI-007 — Triage worklist
**As a** `nurse`, **I want** a list of patients awaiting triage, **so that** I can pull the next one.
**Acceptance criteria**
- **Given** checked-in patients, **When** I open the triage worklist, **Then** they are listed in arrival/priority order for my branch.
**SP:** 2

---

# Epic EMR — Consultation & EMR

### US-EMR-001 — Document a SOAP consultation
**As a** `doctor`, **I want** to document a consultation in SOAP format, **so that** the encounter is recorded structurally.
**Acceptance criteria**
- **Given** a patient in my station, **When** I record Subjective/Objective/Assessment/Plan, **Then** the note is saved to the visit, time-stamped, and attributed to me.
**SP:** 5

### US-EMR-002 — View patient clinical history
**As a** `doctor`, **I want** to view past visits, diagnoses, results, and medications, **so that** I make informed decisions.
**Acceptance criteria**
- **Given** a patient, **When** I open their chart, **Then** a chronological timeline of encounters, labs, imaging, and prescriptions is shown.
**SP:** 5

### US-EMR-003 — Record diagnoses with ICD-10
**As a** `doctor`, **I want** to code diagnoses with ICD-10, **so that** records are standardized and claimable.
**Acceptance criteria**
- **Given** the ICD-10 catalog, **When** I search and select a code, **Then** it is attached as a primary/secondary diagnosis on the visit.
**SP:** 3

### US-EMR-004 — Clinical decision alerts
**As a** `doctor`, **I want** allergy/interaction/duplicate-order alerts at the point of care, **so that** I avoid harmful actions.
**Acceptance criteria**
- **Given** a patient allergy or interacting drug, **When** I prescribe/order, **Then** `ClinicalAlerts` raises a warning I must acknowledge (with override reason captured).
**SP:** 5

### US-EMR-005 — Order labs from consultation
**As a** `doctor`, **I want** to order lab tests within the consultation, **so that** investigations start immediately.
**Acceptance criteria**
- **Given** the lab catalog, **When** I order tests, **Then** a lab order is created, billed, and the patient is routed to the lab station.
**SP:** 3

### US-EMR-006 — Order imaging from consultation
**As a** `doctor`, **I want** to order radiology studies, **so that** imaging is scheduled.
**Acceptance criteria**
- **Given** the imaging catalog, **When** I order a study, **Then** a radiology order is created, billed, and queued for the radiology team.
**SP:** 3

### US-EMR-007 — Prescribe medication
**As a** `doctor`, **I want** to create a prescription with dose/route/frequency/duration, **so that** the pharmacy can dispense.
**Acceptance criteria**
- **Given** the drug catalog, **When** I prescribe, **Then** an `RX-{BRANCH}-YYYY-000001` is generated with a QR code and routed to pharmacy after interaction checks.
**SP:** 5

### US-EMR-008 — Attach clinical documents/images
**As a** `doctor`, **I want** to attach files (e.g. referral letters, photos) to the encounter, **so that** they're in the record.
**Acceptance criteria**
- **Given** a file, **When** I attach it, **Then** it stores via `DocumentService` and is retrievable via signed URL.
**SP:** 2

### US-EMR-009 — Use clinical note templates
**As a** `doctor`, **I want** reusable note templates per specialty, **so that** documentation is faster and consistent.
**Acceptance criteria**
- **Given** a template, **When** I apply it, **Then** the note pre-fills editable structured fields.
**SP:** 3

### US-EMR-010 — Sick leave & medical certificates
**As a** `doctor`, **I want** to issue a sick-leave/medical certificate, **so that** the patient has documentation.
**Acceptance criteria**
- **Given** an encounter, **When** I generate a certificate, **Then** a PDF is produced with hospital branding and stored to the record.
**SP:** 3

### US-EMR-011 — Referral creation
**As a** `doctor`, **I want** to refer a patient to a specialist/branch/external facility, **so that** continuity of care is maintained.
**Acceptance criteria**
- **Given** a patient, **When** I create a referral with reason and target, **Then** a referral record/letter is generated and trackable.
**SP:** 3

### US-EMR-012 — Amend a finalized note (addendum)
**As a** `doctor`, **I want** to add an addendum to a signed note, **so that** corrections are transparent and non-destructive.
**Acceptance criteria**
- **Given** a finalized note, **When** I add an addendum, **Then** the original is preserved, the addendum is appended with author/time, and the change is audited (never overwrite clinical data).
**SP:** 3

### US-EMR-013 — Nursing notes & observations
**As a** `nurse`, **I want** to record nursing notes and follow-up observations, **so that** the care team has continuity.
**Acceptance criteria**
- **Given** a patient encounter, **When** I add a nursing note, **Then** it is time-stamped, attributed, and visible in the chart timeline.
**SP:** 2

### US-EMR-014 — Vitals trend view
**As a** `doctor`, **I want** to see vitals trended over time (Recharts), **so that** I can assess progression.
**Acceptance criteria**
- **Given** multiple vitals records, **When** I open trends, **Then** parameters are charted over time with reference ranges.
**SP:** 3

---

# Epic RX — Prescriptions (Prescribing)

### US-RX-001 — Generate QR-coded prescription
**As a** `doctor`, **I want** each prescription QR-coded, **so that** pharmacy can scan and dispense accurately.
**Acceptance criteria**
- **Given** a saved prescription, **When** it is created, **Then** an `RX-{BRANCH}-YYYY-000001` and scannable QR resolve to the exact items.
**SP:** 3

### US-RX-002 — Drug interaction & allergy check
**As a** `doctor`, **I want** the system to check interactions and allergies before finalizing, **so that** I prescribe safely.
**Acceptance criteria**
- **Given** the patient's meds/allergies, **When** I add a drug, **Then** conflicts are flagged and require acknowledgement/override reason.
**SP:** 5

### US-RX-003 — Dose & frequency validation
**As a** `doctor`, **I want** dose/frequency/duration validated, **so that** unsafe entries are caught.
**Acceptance criteria**
- **Given** catalog dosing rules, **When** I enter an out-of-range dose, **Then** I get a warning before saving.
**SP:** 3

### US-RX-004 — Prescription templates / favorites
**As a** `doctor`, **I want** to save common prescriptions, **so that** repeat prescribing is fast.
**Acceptance criteria**
- **Given** a saved favorite, **When** I apply it, **Then** the items pre-fill and remain editable.
**SP:** 2

### US-RX-005 — Repeat / refill prescription
**As a** `doctor`, **I want** to issue repeat prescriptions for chronic patients, **so that** ongoing therapy continues.
**Acceptance criteria**
- **Given** a chronic medication, **When** I authorize repeats (count + interval), **Then** the pharmacy can dispense refills up to the limit.
**SP:** 3

### US-RX-006 — Cancel / modify before dispensing
**As a** `doctor`, **I want** to amend or cancel a prescription not yet dispensed, **so that** errors are corrected.
**Acceptance criteria**
- **Given** an undispensed prescription, **When** I modify/cancel it, **Then** pharmacy sees the update and the change is audited; dispensed items are immutable.
**SP:** 3

### US-RX-007 — Controlled-substance flagging
**As a** `doctor`, **I want** controlled drugs flagged with extra checks, **so that** we meet regulatory controls.
**Acceptance criteria**
- **Given** a controlled drug, **When** prescribed, **Then** additional justification is required and the event is specially audited.
**SP:** 3

---

# Epic DISP — Pharmacy Dispensing

### US-DISP-001 — View pharmacy worklist
**As a** `pharmacist`, **I want** a queue of pending prescriptions, **so that** I dispense in order.
**Acceptance criteria**
- **Given** prescriptions routed to pharmacy, **When** I open the worklist, **Then** pending items show for my branch with priority/emergency flags.
**SP:** 3

### US-DISP-002 — Scan QR to retrieve prescription
**As a** `pharmacist`, **I want** to scan the prescription QR, **so that** I load the exact items without manual lookup.
**Acceptance criteria**
- **Given** a printed/portal QR, **When** I scan it, **Then** the prescription opens with items, doses, and patient context.
**SP:** 3

### US-DISP-003 — Dispense with stock deduction
**As a** `pharmacist`, **I want** dispensing to deduct stock from inventory, **so that** stock levels stay accurate.
**Acceptance criteria**
- **Given** available stock, **When** I dispense an item, **Then** inventory decrements by batch (FEFO) and a dispensing record is created.
- **Given** insufficient stock, **When** I try to dispense, **Then** I'm blocked or offered a substitute/partial.
**SP:** 5

### US-DISP-004 — Batch & expiry (FEFO) selection
**As a** `pharmacist`, **I want** the system to pick first-expiring batches, **so that** wastage is minimized.
**Acceptance criteria**
- **Given** multiple batches, **When** I dispense, **Then** FEFO is applied by default and expired batches are never dispensable.
**SP:** 3

### US-DISP-005 — Partial dispensing
**As a** `pharmacist`, **I want** to partially dispense and track the balance, **so that** patients get what's available now.
**Acceptance criteria**
- **Given** insufficient stock, **When** I dispense part, **Then** the remaining quantity is tracked as owed/pending.
**SP:** 3

### US-DISP-006 — Generic substitution
**As a** `pharmacist`, **I want** to substitute an equivalent generic within policy, **so that** therapy proceeds when the exact item is out.
**Acceptance criteria**
- **Given** an allowed substitution, **When** I substitute, **Then** the change, reason, and (where required) prescriber consent are recorded.
**SP:** 3

### US-DISP-007 — Patient counseling & instructions
**As a** `pharmacist`, **I want** to print/issue medication instructions, **so that** patients take meds correctly.
**Acceptance criteria**
- **Given** dispensed items, **When** I complete dispensing, **Then** a labeled instruction sheet (dose/frequency/warnings, bilingual en/sw) is produced.
**SP:** 2

### US-DISP-008 — Bill dispensed items
**As a** `pharmacist`, **I want** dispensed items to post to the patient's bill, **so that** charges are captured.
**Acceptance criteria**
- **Given** a dispense event, **When** completed, **Then** charges are added to the open invoice at the branch price.
**SP:** 3

### US-DISP-009 — Over-the-counter sale
**As a** `pharmacist`, **I want** to sell OTC items without a prescription, **so that** walk-in pharmacy sales are handled.
**Acceptance criteria**
- **Given** an OTC item, **When** I sell it, **Then** stock deducts, an invoice/receipt is generated, and payment is taken.
**SP:** 3

### US-DISP-010 — Reverse / return a dispense
**As a** `pharmacist`, **I want** to reverse a dispensing error, **so that** stock and billing are corrected.
**Acceptance criteria**
- **Given** a dispensing error, **When** I reverse it, **Then** stock is restored to batch, billing is credited, and the action is audited (non-destructive).
**SP:** 3

---

# Epic LAB — Laboratory Orders & Results

### US-LAB-001 — Receive lab order & generate sample ID
**As a** `lab-technician`, **I want** incoming orders with barcoded sample IDs, **so that** samples are tracked unambiguously.
**Acceptance criteria**
- **Given** a doctor's lab order, **When** it reaches the lab, **Then** a `LAB-{BRANCH}-YYMMDD-0001` barcode is generated per sample.
**SP:** 3

### US-LAB-002 — Sample collection & accessioning
**As a** `lab-technician`, **I want** to record sample collection and accession it, **so that** chain-of-custody is clear.
**Acceptance criteria**
- **Given** an order, **When** I collect and scan the sample, **Then** status moves to "collected/accessioned" with collector and time recorded.
**SP:** 3

### US-LAB-003 — Lab worklist
**As a** `lab-technician`, **I want** a worklist of pending/in-progress tests, **so that** I process efficiently.
**Acceptance criteria**
- **Given** orders for my branch, **When** I open the worklist, **Then** tests are grouped by status and priority (emergencies first).
**SP:** 2

### US-LAB-004 — Enter & validate results
**As a** `lab-technician`, **I want** to enter results against reference ranges, **so that** abnormal values are flagged.
**Acceptance criteria**
- **Given** a test with reference ranges, **When** I enter a value, **Then** out-of-range results are flagged high/low/critical.
**SP:** 5

### US-LAB-005 — Critical result alerting
**As a** `lab-technician`, **I want** critical results to alert the ordering doctor, **so that** urgent findings are acted on.
**Acceptance criteria**
- **Given** a critical value, **When** I save it, **Then** the ordering doctor is notified via `ClinicalAlerts`/notifications and acknowledgement is tracked.
**SP:** 5

### US-LAB-006 — Result verification / release
**As a** `lab-technician`, **I want** a verify-then-release step, **so that** only validated results reach clinicians.
**Acceptance criteria**
- **Given** entered results, **When** a senior verifies them, **Then** they are released to the EMR and become visible to the doctor/patient (per policy).
**SP:** 3

### US-LAB-007 — Attach result documents
**As a** `lab-technician`, **I want** to attach instrument printouts/PDFs, **so that** source data is retained.
**Acceptance criteria**
- **Given** a result, **When** I attach a file, **Then** it stores via `DocumentService` and is retrievable via signed URL.
**SP:** 2

### US-LAB-008 — View results in EMR
**As a** `doctor`, **I want** released lab results in the chart with trends, **so that** I can interpret them.
**Acceptance criteria**
- **Given** released results, **When** I open the chart, **Then** values, flags, and trend charts are shown with the order context.
**SP:** 3

### US-LAB-009 — Reject / recollect a sample
**As a** `lab-technician`, **I want** to reject unsuitable samples and request recollection, **so that** results are reliable.
**Acceptance criteria**
- **Given** a haemolysed/insufficient sample, **When** I reject it with a reason, **Then** a recollection request is raised and stakeholders notified.
**SP:** 3

### US-LAB-010 — Bill lab tests
**As a** `cashier`, **I want** ordered lab tests to post to billing, **so that** charges are captured.
**Acceptance criteria**
- **Given** a lab order, **When** created/collected, **Then** the test charge posts to the patient invoice per branch price.
**SP:** 2

---

# Epic RAD — Radiology / Imaging

### US-RAD-001 — Receive imaging order & study ID
**As a** `radiologist`, **I want** orders with a `RAD-{BRANCH}-YYMMDD-0001` study ID, **so that** studies are tracked.
**Acceptance criteria**
- **Given** a doctor's imaging order, **When** it reaches radiology, **Then** a study ID is generated and the worklist updates.
**SP:** 3

### US-RAD-002 — Radiology worklist & scheduling
**As a** `radiologist`, **I want** a worklist of pending studies, **so that** I plan scanning.
**Acceptance criteria**
- **Given** orders for my branch, **When** I open the worklist, **Then** studies show by modality, priority, and status.
**SP:** 3

### US-RAD-003 — Mark study performed & upload images
**As a** `radiologist`, **I want** to mark a study performed and upload images, **so that** they're available for reporting.
**Acceptance criteria**
- **Given** a scheduled study, **When** I upload images and mark performed, **Then** files store via `DocumentService` (signed-URL access) and status advances.
**SP:** 5

### US-RAD-004 — Write radiology report
**As a** `radiologist`, **I want** to write findings and impression, **so that** the ordering doctor gets an interpretation.
**Acceptance criteria**
- **Given** a performed study, **When** I write and finalize the report, **Then** it is released to the EMR and the ordering doctor is notified.
**SP:** 5

### US-RAD-005 — Critical imaging finding alert
**As a** `radiologist`, **I want** to flag critical findings, **so that** urgent results are escalated.
**Acceptance criteria**
- **Given** a critical finding, **When** I flag it, **Then** the ordering doctor is alerted and acknowledgement is tracked.
**SP:** 3

### US-RAD-006 — View images & report in EMR
**As a** `doctor`, **I want** to view images and the report in the chart, **so that** I can act on them.
**Acceptance criteria**
- **Given** a released study, **When** I open the chart, **Then** the report and image links (signed URLs) are available.
**SP:** 3

### US-RAD-007 — Addendum to radiology report
**As a** `radiologist`, **I want** to add an addendum to a finalized report, **so that** corrections are transparent.
**Acceptance criteria**
- **Given** a finalized report, **When** I add an addendum, **Then** the original is preserved and the addendum is appended with author/time and audited.
**SP:** 2

### US-RAD-008 — Bill imaging studies
**As a** `cashier`, **I want** imaging orders to post to billing, **so that** charges are captured.
**Acceptance criteria**
- **Given** an imaging order, **When** created/performed, **Then** the charge posts to the patient invoice at branch price.
**SP:** 2

---

# Epic BILL — Billing, Payments & M-Pesa

### US-BILL-001 — Open a patient invoice/bill
**As a** `cashier`, **I want** an open invoice per visit, **so that** charges accumulate against it.
**Acceptance criteria**
- **Given** a visit, **When** services are rendered, **Then** charges post to an open invoice numbered `INV-{BRANCH}-YYYY-000001` at branch prices, money as `DECIMAL(12,2)` KES.
**SP:** 3

### US-BILL-002 — Itemized bill view
**As a** `cashier`, **I want** an itemized bill (consultation, labs, imaging, drugs), **so that** patients see what they're paying for.
**Acceptance criteria**
- **Given** posted charges, **When** I open the invoice, **Then** line items, quantities, unit prices, taxes, and totals are shown.
**SP:** 3

### US-BILL-003 — M-Pesa STK Push payment
**As a** `cashier`, **I want** to trigger an M-Pesa STK push to the patient's phone, **so that** they pay without cash.
**Acceptance criteria**
- **Given** an amount due, **When** I initiate STK push, **Then** `MpesaDarajaGateway` sends the prompt and the invoice shows "awaiting payment".
- **Given** a Daraja callback, **When** received, **Then** it is verified on a signed webhook and processed idempotently by `CheckoutRequestID`/`mpesa_receipt`.
**SP:** 8

### US-BILL-004 — M-Pesa Paybill/Till reconciliation
**As a** `cashier`, **I want** Paybill/Till payments matched to invoices, **so that** manual M-Pesa payments reconcile.
**Acceptance criteria**
- **Given** a Paybill/Till confirmation, **When** received, **Then** the payment is matched by account/reference to the invoice, idempotently.
**SP:** 5

### US-BILL-005 — Record cash payment & receipt
**As a** `cashier`, **I want** to record a cash payment and print a receipt, **so that** cash transactions are tracked.
**Acceptance criteria**
- **Given** a cash payment, **When** I record it via `CashGateway`, **Then** a `RCP-{BRANCH}-YYYY-000001` receipt is generated and the balance updates.
**SP:** 3

### US-BILL-006 — Partial payments & balance tracking
**As a** `cashier`, **I want** to take partial payments, **so that** patients can pay over time.
**Acceptance criteria**
- **Given** an outstanding balance, **When** a partial payment is recorded, **Then** the balance reduces and remains tracked until cleared.
**SP:** 3

### US-BILL-007 — Apply discounts / waivers
**As a** `cashier`, **I want** to apply an authorized discount/waiver, **so that** approved concessions are reflected.
**Acceptance criteria**
- **Given** discount permission, **When** I apply a discount with reason, **Then** the total adjusts and the action is audited; over-threshold discounts require admin approval.
**SP:** 3

### US-BILL-008 — Refunds
**As a** `cashier`, **I want** to process a refund, **so that** overpayments/cancellations are corrected.
**Acceptance criteria**
- **Given** an eligible payment, **When** I refund it, **Then** the ledger is credited, a refund record created, and the action audited (non-destructive).
**SP:** 5

### US-BILL-009 — Split payment (cash + M-Pesa + insurance)
**As a** `cashier`, **I want** to split a bill across methods and insurance, **so that** mixed settlements are supported.
**Acceptance criteria**
- **Given** an invoice, **When** I allocate amounts to cash, M-Pesa, and SHA cover, **Then** the allocations sum to the total and each is tracked separately.
**SP:** 5

### US-BILL-010 — Daily cashier reconciliation / shift report
**As a** `cashier`, **I want** an end-of-shift reconciliation report, **so that** I can balance my till.
**Acceptance criteria**
- **Given** my shift transactions, **When** I close the shift, **Then** totals by method (cash/M-Pesa/insurance) are summarized for handover.
**SP:** 3

### US-BILL-011 — Invoice PDF & email
**As a** `patient`, **I want** a PDF invoice/receipt emailed to me, **so that** I have a record.
**Acceptance criteria**
- **Given** a finalized invoice, **When** I request it, **Then** a branded PDF is generated and delivered via the notification channel.
**SP:** 3

### US-BILL-012 — Price estimate / quotation
**As a** `cashier`, **I want** to produce a pre-treatment cost estimate, **so that** patients know expected costs.
**Acceptance criteria**
- **Given** selected services, **When** I generate a quote, **Then** an itemized estimate is produced (non-binding) at branch prices.
**SP:** 3

---

# Epic SHA — SHA Insurance & Claims

### US-SHA-001 — Verify SHA eligibility
**As a** `receptionist`, **I want** to verify a patient's SHA eligibility, **so that** covered services are billed correctly.
**Acceptance criteria**
- **Given** a SHA member number, **When** I check eligibility via `ShaGateway`, **Then** active/inactive status and scheme benefits are returned and stored on the visit.
**SP:** 5

### US-SHA-002 — Request pre-authorization
**As a** `cashier`, **I want** to request pre-auth for covered services, **so that** the claim isn't rejected later.
**Acceptance criteria**
- **Given** a service needing pre-auth, **When** I submit a request, **Then** `ShaGateway` returns an auth reference/status which is attached to the visit.
**SP:** 5

### US-SHA-003 — Create a SHA claim
**As a** `cashier`, **I want** to compile a claim from the visit's covered services, **so that** we can be reimbursed.
**Acceptance criteria**
- **Given** covered, diagnosed (ICD-10) services, **When** I create a claim, **Then** a `CLM-{BRANCH}-YYYY-00001` is generated with line items and required attachments.
**SP:** 5

### US-SHA-004 — Submit & track claim status
**As a** `cashier`, **I want** to submit claims and track their status, **so that** I know what's paid/pending/rejected.
**Acceptance criteria**
- **Given** a complete claim, **When** I submit it via `ShaGateway`, **Then** status transitions (submitted/under-review/approved/rejected/paid) are tracked and timestamped.
**SP:** 5

### US-SHA-005 — Handle claim rejections & resubmission
**As a** `cashier`, **I want** to view rejection reasons and resubmit, **so that** revenue isn't lost.
**Acceptance criteria**
- **Given** a rejected claim, **When** I view it, **Then** the reason is shown and I can correct and resubmit, with history preserved.
**SP:** 5

### US-SHA-006 — Reconcile SHA remittances
**As a** `cashier`, **I want** to reconcile remittances against submitted claims, **so that** payments are matched.
**Acceptance criteria**
- **Given** a remittance, **When** I reconcile, **Then** claims are matched, shortfalls flagged, and patient balances updated for co-pays.
**SP:** 5

### US-SHA-007 — Claims dashboard
**As a** `hospital-admin`, **I want** a claims dashboard, **so that** I can monitor reimbursement performance.
**Acceptance criteria**
- **Given** claims data, **When** I open the dashboard, **Then** counts and KES values by status, branch, and aging are shown (Recharts).
**SP:** 3

### US-SHA-008 — Capture co-pay at billing
**As a** `cashier`, **I want** to capture the patient co-pay portion, **so that** the non-covered balance is collected.
**Acceptance criteria**
- **Given** a covered service with co-pay, **When** I bill, **Then** the SHA portion and patient co-pay are split and the co-pay is collected via M-Pesa/cash.
**SP:** 3

---

# Epic IPD — Inpatient / Ward Management

### US-IPD-001 — Admit a patient
**As a** `doctor`, **I want** to admit a patient with an admission number, **so that** inpatient care is tracked.
**Acceptance criteria**
- **Given** an admission decision, **When** I admit, **Then** an `ADM-{BRANCH}-YYYY-00001` is generated, a bed assigned, and the patient enters the ward census.
**SP:** 5

### US-IPD-002 — Bed/ward management
**As a** `nurse`, **I want** a bed board of wards/rooms/beds, **so that** I can manage occupancy.
**Acceptance criteria**
- **Given** a ward layout, **When** I open the bed board, **Then** occupied/free/cleaning beds are shown and assignable.
**SP:** 5

### US-IPD-003 — Transfer / move bed
**As a** `nurse`, **I want** to transfer a patient between beds/wards/branches, **so that** placement reflects care needs.
**Acceptance criteria**
- **Given** an admitted patient, **When** I transfer them, **Then** the old bed frees, the new bed occupies, and the move is logged.
**SP:** 3

### US-IPD-004 — Inpatient medication administration (eMAR)
**As a** `nurse`, **I want** to record medication administration against orders, **so that** the MAR is accurate.
**Acceptance criteria**
- **Given** active medication orders, **When** I administer a dose, **Then** it is recorded with time/nurse and missed/late doses are flagged.
**SP:** 5

### US-IPD-005 — Ward rounds & progress notes
**As a** `doctor`, **I want** to document daily rounds/progress notes, **so that** the inpatient record is complete.
**Acceptance criteria**
- **Given** an admitted patient, **When** I document a round, **Then** the note is time-stamped, attributed, and visible to the care team.
**SP:** 3

### US-IPD-006 — Inpatient vitals & observations charting
**As a** `nurse`, **I want** to chart inpatient vitals on a schedule, **so that** deterioration is detected.
**Acceptance criteria**
- **Given** an observation schedule, **When** I record vitals, **Then** they trend over the admission and breach thresholds raise alerts.
**SP:** 3

### US-IPD-007 — Daily bed/service charge accrual
**As a** `cashier`, **I want** bed and inpatient service charges to accrue daily, **so that** the inpatient bill stays current.
**Acceptance criteria**
- **Given** an active admission, **When** the daily cycle runs, **Then** bed fees and recurring charges post to the admission invoice.
**SP:** 5

### US-IPD-008 — Discharge a patient
**As a** `doctor`, **I want** to discharge with a summary, **so that** care concludes properly.
**Acceptance criteria**
- **Given** a fit-for-discharge patient, **When** I discharge, **Then** a discharge summary is generated, the bed frees, and the final bill is prepared.
**SP:** 5

### US-IPD-009 — Discharge billing clearance
**As a** `cashier`, **I want** to finalize and clear the inpatient bill at discharge, **so that** the patient leaves settled.
**Acceptance criteria**
- **Given** a discharge, **When** I finalize the bill, **Then** all accrued charges, SHA cover, and co-pay are reconciled before clearance.
**SP:** 3

### US-IPD-010 — Ward census & occupancy report
**As a** `hospital-admin`, **I want** ward census and occupancy metrics, **so that** I can manage capacity.
**Acceptance criteria**
- **Given** admissions data, **When** I view the report, **Then** occupancy %, admissions, discharges, and average length of stay are shown per branch.
**SP:** 3

---

# Epic INV — Inventory & Procurement

### US-INV-001 — Maintain item catalog & stock per branch
**As a** `pharmacist`, **I want** branch stock levels per item/batch, **so that** I know what's available.
**Acceptance criteria**
- **Given** items and branches, **When** I view stock, **Then** quantities by batch/expiry are shown for my active branch.
**SP:** 3

### US-INV-002 — Receive stock (GRN)
**As a** `pharmacist`, **I want** to record goods received against a PO, **so that** stock increases accurately.
**Acceptance criteria**
- **Given** a delivery, **When** I create a GRN with batch/expiry/quantity, **Then** stock increments and the PO updates to received.
**SP:** 5

### US-INV-003 — Create purchase orders
**As a** `hospital-admin`, **I want** to raise POs to suppliers, **so that** restocking is controlled.
**Acceptance criteria**
- **Given** items below reorder level, **When** I create a PO, **Then** a `PO-{BRANCH}-YYYY-0001` is generated and sent to the supplier.
**SP:** 3

### US-INV-004 — Reorder-level alerts
**As a** `pharmacist`, **I want** alerts when stock hits the reorder level, **so that** we avoid stockouts.
**Acceptance criteria**
- **Given** a reorder threshold, **When** stock falls to/below it, **Then** an alert/notification is raised to procurement.
**SP:** 3

### US-INV-005 — Expiry monitoring & alerts
**As a** `pharmacist`, **I want** alerts for near-expiry/expired batches, **so that** wastage and risk are reduced.
**Acceptance criteria**
- **Given** batch expiry dates, **When** an item nears expiry, **Then** it's flagged on a watchlist and expired batches are blocked from dispensing.
**SP:** 3

### US-INV-006 — Inter-branch stock transfer
**As a** `pharmacist`, **I want** to transfer stock between branches, **so that** shortages are balanced.
**Acceptance criteria**
- **Given** stock at branch A, **When** I transfer to branch B, **Then** A decrements, B increments on receipt, and the transfer is auditable.
**SP:** 5

### US-INV-007 — Stock adjustments (count/wastage)
**As a** `pharmacist`, **I want** to adjust stock for counts/damage/loss, **so that** records match reality.
**Acceptance criteria**
- **Given** a variance, **When** I adjust with a reason code, **Then** stock updates and the adjustment is audited.
**SP:** 3

### US-INV-008 — Stock-take / cycle count
**As a** `pharmacist`, **I want** to perform a stock-take, **so that** physical and system counts reconcile.
**Acceptance criteria**
- **Given** a counting session, **When** I submit counts, **Then** variances are computed and posted as adjustments after approval.
**SP:** 5

### US-INV-009 — Supplier management
**As a** `hospital-admin`, **I want** to manage suppliers, **so that** procurement has accurate vendors.
**Acceptance criteria**
- **Given** supplier details, **When** I add/edit them, **Then** they're selectable on POs and the change is logged.
**SP:** 2

### US-INV-010 — Inventory valuation & consumption report
**As a** `hospital-admin`, **I want** valuation and consumption reports, **so that** I can control inventory cost.
**Acceptance criteria**
- **Given** stock and movement data, **When** I run the report, **Then** on-hand value, consumption, and wastage are shown per branch/period.
**SP:** 3

---

# Epic RPT — Reporting & Analytics

### US-RPT-001 — Executive dashboard
**As a** `hospital-admin`, **I want** a cross-branch executive dashboard, **so that** I can monitor the hospital at a glance.
**Acceptance criteria**
- **Given** `branch.view-all`, **When** I open the dashboard, **Then** KPIs (patients/day, revenue, occupancy, claims) are shown across branches (Recharts).
**SP:** 5

### US-RPT-002 — Revenue & financial report
**As a** `cashier` / `hospital-admin`, **I want** revenue reports by service, method, and branch, **so that** finances are transparent.
**Acceptance criteria**
- **Given** a date range, **When** I run the report, **Then** revenue by service line, payment method, and branch is shown with KES totals.
**SP:** 3

### US-RPT-003 — Patient flow / throughput report
**As a** `hospital-admin`, **I want** patient-volume and queue-throughput reports, **so that** I can plan staffing.
**Acceptance criteria**
- **Given** visit and queue data, **When** I run it, **Then** volumes, wait/service times, and peak hours are shown per branch.
**SP:** 3

### US-RPT-004 — Clinical/diagnosis statistics
**As a** `hospital-admin`, **I want** diagnosis/morbidity statistics by ICD-10, **so that** I understand disease patterns.
**Acceptance criteria**
- **Given** coded diagnoses, **When** I run the report, **Then** top conditions and trends are shown per period/branch.
**SP:** 3

### US-RPT-005 — MOH / regulatory report export
**As a** `hospital-admin`, **I want** to export MOH-format reports, **so that** statutory reporting is met.
**Acceptance criteria**
- **Given** the required period, **When** I export, **Then** a compliant report (CSV/PDF) is produced for submission.
**SP:** 5

### US-RPT-006 — Scheduled / emailed reports
**As a** `hospital-admin`, **I want** scheduled reports emailed automatically, **so that** stakeholders get them without manual effort.
**Acceptance criteria**
- **Given** a schedule, **When** it triggers, **Then** the report is generated and emailed via the notification channel.
**SP:** 3

### US-RPT-007 — Export to CSV/Excel/PDF
**As a** `hospital-admin`, **I want** to export any report, **so that** I can share/analyze offline.
**Acceptance criteria**
- **Given** a report view, **When** I export, **Then** CSV/Excel/PDF is generated honoring my branch scope and filters.
**SP:** 2

### US-RPT-008 — Pharmacy & inventory analytics
**As a** `pharmacist` / `hospital-admin`, **I want** dispensing and consumption analytics, **so that** I optimize stock and prescribing.
**Acceptance criteria**
- **Given** dispensing/inventory data, **When** I run it, **Then** top drugs, consumption trends, and wastage are visualized.
**SP:** 3

---

# Epic PORTAL — Patient Portal

### US-PORTAL-001 — Patient self-registration & verification
**As a** `patient`, **I want** to create a portal account verified by OTP, **so that** I can access my information securely.
**Acceptance criteria**
- **Given** my phone/email, **When** I register, **Then** an OTP verifies me and my portal account links to my patient record (or is queued for staff matching).
**SP:** 5

### US-PORTAL-002 — View appointments
**As a** `patient`, **I want** to see upcoming and past appointments, **so that** I can plan visits.
**Acceptance criteria**
- **Given** my appointments, **When** I open the portal, **Then** upcoming and history are listed with status.
**SP:** 3

### US-PORTAL-003 — View lab/imaging results
**As a** `patient`, **I want** to view my released results, **so that** I stay informed.
**Acceptance criteria**
- **Given** results released for patient viewing, **When** I open them, **Then** values/reports are shown; un-released results are hidden.
**SP:** 3

### US-PORTAL-004 — View prescriptions & medications
**As a** `patient`, **I want** to see my prescriptions and medication instructions, **so that** I take meds correctly.
**Acceptance criteria**
- **Given** my prescriptions, **When** I view one, **Then** items, dosing, and the QR are shown (bilingual en/sw).
**SP:** 3

### US-PORTAL-005 — View & pay bills (M-Pesa)
**As a** `patient`, **I want** to view and pay my bills via M-Pesa, **so that** I can settle remotely.
**Acceptance criteria**
- **Given** an outstanding invoice, **When** I pay via STK push, **Then** the payment processes idempotently and the balance updates.
**SP:** 5

### US-PORTAL-006 — Download documents (signed URLs)
**As a** `patient`, **I want** to download my reports/receipts, **so that** I have copies.
**Acceptance criteria**
- **Given** my documents, **When** I download one, **Then** access is via a time-limited signed URL scoped to me.
**SP:** 2

### US-PORTAL-007 — Update contact details & consent
**As a** `patient`, **I want** to update my contact info and manage consent, **so that** my data stays current and lawful.
**Acceptance criteria**
- **Given** my profile, **When** I update contacts/consent, **Then** changes are saved (sensitive changes may require staff verification) and logged.
**SP:** 3

### US-PORTAL-008 — Notifications & reminders preferences
**As a** `patient`, **I want** to manage how I'm contacted, **so that** I get the reminders I want.
**Acceptance criteria**
- **Given** channels (SMS/email), **When** I set preferences, **Then** notifications respect them.
**SP:** 2

### US-PORTAL-009 — Offline access to cached records (PWA)
**As a** `patient`, **I want** key records cached offline, **so that** I can view them without connectivity.
**Acceptance criteria**
- **Given** previously loaded data, **When** I'm offline, **Then** the PWA serves the cached read-only records.
**SP:** 3

---

# Epic NOTIF — Communication & Notifications

### US-NOTIF-001 — Provider-agnostic notification dispatch
**As a** `hospital-admin`, **I want** notifications routed through a configurable provider manager, **so that** we can switch SMS/email vendors without code changes.
**Acceptance criteria**
- **Given** `config/notifications.php`, **When** a notification fires, **Then** it dispatches via `NotificationChannelManager` (AfricasTalking SMS, Mailgun/Resend email) and never calls a provider SDK directly.
**SP:** 5

### US-NOTIF-002 — Delivery tracking & retries
**As a** `hospital-admin`, **I want** delivery status and automatic retries, **so that** important messages aren't silently lost.
**Acceptance criteria**
- **Given** a send attempt, **When** it fails, **Then** it retries per policy and the final status (sent/failed) is recorded.
**SP:** 3

### US-NOTIF-003 — Bilingual templates (en/sw)
**As a** `hospital-admin`, **I want** message templates in English and Kiswahili, **so that** patients understand them.
**Acceptance criteria**
- **Given** a patient's language preference, **When** a message sends, **Then** the correct localized template is used.
**SP:** 3

### US-NOTIF-004 — Internal staff alerts
**As a** `doctor`, **I want** in-app alerts for critical results/assignments, **so that** I act promptly.
**Acceptance criteria**
- **Given** a critical event, **When** it fires, **Then** I get an in-app (and optionally push) alert with acknowledgement tracking.
**SP:** 3

---

# Epic AUD — Audit & Compliance

### US-AUD-001 — Immutable PHI access log
**As a** `hospital-admin`, **I want** an immutable log of PHI access and security events, **so that** we meet Data Protection Act 2019 requirements.
**Acceptance criteria**
- **Given** a PHI view/export or security event, **When** it occurs, **Then** a dedicated immutable `audit_logs` entry records who/what/when/where (IP/device) and cannot be edited or deleted.
**SP:** 5

### US-AUD-002 — Model change history
**As a** `hospital-admin`, **I want** before/after change history on domain records, **so that** I can investigate disputes.
**Acceptance criteria**
- **Given** a record change, **When** saved, **Then** Spatie Activity Log captures the diff and actor.
**SP:** 3

### US-AUD-003 — Audit search & export
**As a** `hospital-admin`, **I want** to search and export audit logs, **so that** I can respond to investigations/regulators.
**Acceptance criteria**
- **Given** filters (user, entity, date, branch), **When** I search, **Then** matching events are listed and exportable, read-only.
**SP:** 3

### US-AUD-004 — Clinical-data retention enforcement
**As a** `hospital-admin`, **I want** clinical data retained ≥10 years and never hard-deleted, **so that** we comply with retention rules.
**Acceptance criteria**
- **Given** any clinical record, **When** a delete is attempted, **Then** it is soft-deleted/archived (never hard-deleted) and retention rules are enforced.
**SP:** 3

### US-AUD-005 — Data subject access request (DSAR)
**As a** `hospital-admin`, **I want** to export all of a patient's data on request, **so that** we satisfy DSARs under the DPA.
**Acceptance criteria**
- **Given** a verified DSAR, **When** I generate the export, **Then** a complete, structured copy of the patient's data is produced and the request is logged.
**SP:** 5

---

## Backlog summary

| Epic | Stories | Σ Story points |
|---|---|---|
| AUTH | 10 | 32 |
| ADM | 10 | 34 |
| REG | 10 | 33 |
| APPT | 10 | 33 |
| QUE | 10 | 36 |
| TRI | 7 | 21 |
| EMR | 14 | 49 |
| RX | 7 | 22 |
| DISP | 10 | 33 |
| LAB | 10 | 31 |
| RAD | 8 | 26 |
| BILL | 12 | 47 |
| SHA | 8 | 36 |
| IPD | 10 | 40 |
| INV | 10 | 35 |
| RPT | 8 | 27 |
| PORTAL | 9 | 29 |
| NOTIF | 4 | 14 |
| AUD | 5 | 19 |
| **Total** | **172** | **597** |

> **Coverage note:** All 10 canonical roles appear as story actors across the backlog, and every
> module/area named in the Foundation is represented: registration, appointments, queue, triage,
> consultation/EMR, prescriptions, dispensing, lab orders/results, radiology, billing/M-Pesa,
> SHA claims, inpatient, inventory, reporting, patient portal, admin/branch management, and
> auth/MFA — plus communication and audit/compliance cross-cuts.

# Afya HMS — User Data Editing Policy

> **Document:** `20-user-data-editing-policy.md`
> **System:** Afya HMS — Laravel 11 + React/Vite
> **Status:** Canonical Reference
> **Relates to:** `18-canonical-decisions.md`, `19-roles-admin-vs-superadmin.md`

---

## Why a Data Editing Policy Must Exist Before Code

If you write controllers before answering "who owns what data and who can change it,"
you will build yourself into a corner. Access control retrofitted after the fact is one
of the most dangerous and expensive rewrites in any system — especially a health system.

This document defines the canonical answer for every class of data in Afya HMS:
who can read it, who can edit it, under what conditions, and what must be logged.

Kenya's **Data Protection Act 2019** and the globally recognized principle that
**health records have legal standing** make these decisions non-negotiable.

---

## The Core Principle

> **Data ownership and data stewardship are not the same thing.**

A patient *owns* their personal information — but they do not *steward* their clinical
record. Clinical records are created and maintained by licensed clinical staff.
The patient is the subject of those records, not their custodian.

Blurring this distinction is the single most dangerous design mistake you can make
in a health system.

---

## Data Classification

Every piece of data in Afya HMS falls into one of four classes.
The class determines who can edit it — not the user's role alone.

---

### Class 1 — Demographic Data
*Personal identity and contact information*

**Examples:** Full name, date of birth, gender, national ID, address, phone number,
email address, next of kin, emergency contact.

**Who Owns It:** The patient.

**Who Can Read It:** Patient (own), Clinical Staff (assigned), Hospital Admin, Superadmin.

**Who Can Edit It:**

| Actor | Can Edit? | Conditions |
|---|---|---|
| Patient (self) | ✅ Yes | Changes are logged; sensitive fields (DOB, National ID) may require verification |
| Receptionist | ✅ Yes | On patient's behalf at point of registration |
| Nurse / Doctor | ✅ Yes | For operational accuracy during care |
| Hospital Admin | ✅ Yes | Operational corrections |
| Superadmin | ✅ Yes | Emergency only |

**Mandatory Controls:**
- Every edit must be **audit logged**: actor, field changed, old value, new value, timestamp.
- Changes to **National ID or Date of Birth** should require a secondary confirmation step — these have legal and insurance implications.
- Patients editing their own data via the portal must re-authenticate (confirm password) before the change is saved.

---

### Class 2 — Clinical Data
*Medically significant records with legal and safety implications*

**Examples:** Diagnoses, prescriptions, medication history, allergies, lab results,
imaging reports, surgical history, vaccination records, referral letters,
treatment plans, clinical notes, vital signs records.

**Who Owns It:** The hospital (legally). The patient is the subject, not the owner.

**Who Can Read It:** Patient (view-only, own records), Assigned clinical staff,
Hospital Admin (operational summaries only — not raw clinical notes),
Superadmin (break-glass, fully logged).

**Who Can Edit It:**

| Actor | Can Edit? | Conditions |
|---|---|---|
| Patient | ❌ Never | |
| Receptionist | ❌ Never | |
| Nurse | ✅ Within scope | Can add vitals, nursing notes; cannot edit diagnoses or prescriptions |
| Doctor | ✅ Primary owner | Can create and amend their own clinical entries |
| Pharmacist | ✅ Limited | Can update dispensing status on prescriptions; cannot alter the prescription itself |
| Lab Technician | ✅ Limited | Can enter and amend their own lab results only |
| Hospital Admin | ❌ Never | Administrative role — no clinical data access |
| Superadmin | ⚠️ Break-glass only | Must log a break-glass reason; generates a mandatory security alert |

**Why Patients Cannot Edit Clinical Data — The Full Argument:**

1. **Safety:** A patient editing their allergy record to remove a penicillin allergy,
   then receiving penicillin, is a patient safety event. The hospital carries that liability.

2. **Drug-seeking:** Patients editing prescription history is a known fraud vector
   in pharmacy systems.

3. **Legal standing:** Clinical records are legal documents. Tampered records expose the
   hospital to criminal liability in malpractice cases, insurance fraud investigations,
   and regulatory audits.

4. **Kenya-specific:** SHA (Social Health Authority) insurance audits inspect clinical
   records for claim validation. A patient-editable record is a fraudulent claim waiting
   to happen.

5. **Data Protection Act 2019:** Section 25 requires that health data be processed
   with appropriate technical safeguards. Patient self-editing of clinical records
   without clinical oversight does not meet this standard.

**The Correct Patient Mechanism:**
If a patient believes a clinical record is incorrect, they submit a **Data Correction Request**.
This triggers a review workflow where the originating clinician reviews and approves or
rejects the correction. The patient's request and the outcome are both logged.
The patient gets a notification of the decision. This is the legally defensible path.

---

### Class 3 — Authentication & Account Data
*Credentials and account security controls*

**Examples:** Password, email address (used for login), phone number (used for 2FA),
login history, active sessions, linked devices.

**Who Can Edit It:**

| Actor | Can Edit? | Conditions |
|---|---|---|
| Patient (own account) | ✅ Password | Must confirm current password first |
| Patient (own account) | ✅ Phone/Email | Triggers OTP verification to old and new contact; old contact is notified |
| Clinical Staff (own account) | ✅ Same rules as patient | |
| Hospital Admin | ✅ Force password reset | Cannot set a password directly — triggers a reset link |
| Hospital Admin | ❌ Cannot view passwords | Architecturally impossible with proper hashing |
| Superadmin | ✅ Reset any account | Emergency only; logged |

**Critical Rules:**
- **Email change** must send a confirmation link to the new email AND a notification to the old email.
- **Phone change** must send OTP to the new phone AND a notification to the old phone.
- **Password change** must invalidate all other active sessions (not just the current one).
- **No actor** can directly read or set a plaintext password — only reset flows are permitted.
- Login history (last N logins with IP, device, timestamp) is **read-only** for all actors including Superadmin.

---

### Class 4 — System & Operational Data
*Records created by the system itself, not by any user*

**Examples:** Audit logs, system event logs, financial transaction records (M-Pesa callbacks),
generated reports, scheduled job records, notification delivery logs.

**Who Can Read It:**
- Audit logs: Superadmin (all), Hospital Admin (hospital-scoped only)
- Financial records: Hospital Admin, Billing staff (own transactions), Superadmin
- System event logs: Superadmin only

**Who Can Edit It:**

| Actor | Can Edit? |
|---|---|
| Anyone | ❌ Never |

**These records must be immutable.** Audit logs that can be edited are not audit logs —
they are a liability. Append-only. No exceptions. No soft deletes on audit records.

---

## The Data Ownership Matrix — Full Summary

| Data Type | Patient | Receptionist | Nurse | Doctor | Pharmacist | Lab Tech | Hospital Admin | Superadmin |
|---|---|---|---|---|---|---|---|---|
| Own demographics | ✏️ Edit | ✏️ Edit | ✏️ Edit | ✏️ Edit | 👁️ View | 👁️ View | ✏️ Edit | ✏️ Edit |
| Diagnoses | 👁️ View | ❌ | ❌ | ✏️ Own only | 👁️ View | ❌ | ❌ | ⚠️ Break-glass |
| Prescriptions | 👁️ View | ❌ | ❌ | ✏️ Own only | ✏️ Dispense status | ❌ | ❌ | ⚠️ Break-glass |
| Allergies | 👁️ View | ❌ | ✏️ Add/flag | ✏️ Full | ❌ | ❌ | ❌ | ⚠️ Break-glass |
| Lab Results | 👁️ View | ❌ | 👁️ View | 👁️ View | ❌ | ✏️ Own only | ❌ | ⚠️ Break-glass |
| Vitals | 👁️ View | ❌ | ✏️ Enter | 👁️ View | ❌ | ❌ | ❌ | ⚠️ Break-glass |
| Clinical Notes | 👁️ View | ❌ | ✏️ Nursing notes | ✏️ Own only | ❌ | ❌ | ❌ | ⚠️ Break-glass |
| Own password | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | 🔄 Reset only | 🔄 Reset only |
| Others' passwords | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔄 Reset only | 🔄 Reset only |
| Account status | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁️ Hospital-scoped | 👁️ System-wide |

> **Key:** ✏️ Edit | 👁️ View Only | ❌ No Access | ⚠️ Break-glass (logged emergency) | 🔄 Reset trigger (no direct set) | ✅ Activate/Deactivate

---

## Audit Logging — Non-Negotiable Requirements

Every write operation (create, update, deactivate, delete) against any Class 1, 2, or 3
data must produce an audit record containing:

| Field | Description |
|---|---|
| `actor_id` | The user ID of who made the change |
| `actor_role` | Their role at the time of the change |
| `action` | The action performed (`updated`, `deactivated`, `reset_password`, etc.) |
| `subject_type` | The model being changed (e.g. `Patient`, `User`, `Prescription`) |
| `subject_id` | The ID of the record being changed |
| `field_name` | The specific field changed |
| `old_value` | The value before the change (hashed or masked for sensitive fields) |
| `new_value` | The value after the change |
| `ip_address` | The actor's IP address |
| `user_agent` | Browser/client information |
| `created_at` | Timestamp of the action — use UTC, display in Africa/Nairobi timezone |
| `break_glass_reason` | Required only for Superadmin Class 2 access; null otherwise |

**Passwords must never appear in audit logs — not even hashed.**
Log the action (`password_reset`, `password_changed`) but not the value.

---

## Data Correction Request — The Patient's Path to Fixing Clinical Records

Since patients cannot edit clinical data directly, this workflow must exist:

1. Patient submits a **Data Correction Request** via their portal, specifying:
   - Which record they believe is incorrect
   - What they believe the correct value should be
   - Why they believe it is incorrect

2. Request is routed to the **originating clinician** (the doctor/nurse who created the record).
   If the originating clinician is unavailable, it routes to the department head.

3. Clinician reviews and either:
   - **Approves** the correction (applies it with their own audit entry)
   - **Rejects** it with a written reason

4. Patient receives an SMS/email notification of the outcome.

5. Both the request and the outcome are permanently logged regardless of the decision.

---

## What You Must Build in Afya HMS

Based on this policy, the following items are required:

### Database
- [ ] `audit_logs` table with all fields defined above (append-only, no soft deletes)
- [ ] `data_correction_requests` table for the patient correction workflow
- [ ] `deactivated_reason`, `deactivated_at`, `deactivated_by` on the `users` table
- [ ] Ensure all clinical tables track `created_by` and `updated_by` foreign keys

### Laravel Architecture
- [ ] `AuditLog` model and `AuditLogger` service — inject into every service that writes data
- [ ] Laravel Policies per data class (not just per model) — `DemographicPolicy`, `ClinicalRecordPolicy`
- [ ] Break-glass middleware that requires a reason field before Superadmin clinical access
- [ ] `DataCorrectionRequest` workflow with notification via AfricasTalking

### Patient Portal
- [ ] Patient can edit their own demographic data (with re-authentication)
- [ ] Email/phone change triggers dual-verification (old + new contact)
- [ ] Patient can view (read-only) all clinical records
- [ ] Patient can submit Data Correction Requests
- [ ] Patient cannot see or interact with audit logs

### Security
- [ ] Password changes must invalidate all other active Sanctum tokens for that user
- [ ] Email/phone changes must notify the old contact channel
- [ ] National ID and Date of Birth changes must require supervisor confirmation or re-auth

---

*This document is part of the Afya HMS canonical decisions series.*
*Any controller, policy, or migration that contradicts this document is incorrect.*
*Update this document first, then update the code.*

# Afya HMS — User & Staff Data Editing: Complete Specification

> **Document:** `22-user-staff-data-editing-spec.md`
> **System:** Afya HMS — Laravel 11 + React/Vite
> **Status:** Canonical Implementation Reference
> **Depends on:** `20-user-data-editing-policy.md`, `21-profile-editing-fix-plan.md`
> **Do not implement anything in this document until `21` is fully executed.**

---

## Purpose of This Document

Documents `20` and `21` answer *who can edit what* and *what is broken*.
This document answers the deeper question: **exactly how does editing work,
end to end, for every user type in the system?**

This is the specification your controllers, FormRequests, React components,
and audit logger must be built against. If there is a conflict between this
document and existing code, this document wins. Update the code.

---

## The Non-Negotiable Rules That Govern Every Edit in This System

Before the field-by-field breakdown, burn these into your thinking.
Every edit flow in Afya HMS obeys all of them without exception.

**Rule 1 — The API is the law, not the UI.**
Hiding a field in the frontend is cosmetic. The backend FormRequest must
explicitly reject disallowed fields. If the field is not allowed, the API
returns `422` with a clear message. Period.

**Rule 2 — Every write produces an audit log entry.**
No exception for self-edits. No exception for "minor" fields. No exception
for emergency admin edits. The audit log is the system's memory.

**Rule 3 — Sensitive fields have a separate, harder gate.**
`national_id`, `date_of_birth`, `staff_id`, `role`, `department` are not
just regular fields with an extra permission. They require a separate
request path, a separate FormRequest, and a separate audit action string.

**Rule 4 — Contact credentials (email, phone used for login/OTP) are never
updated inline.**
They go through a pending verification flow. The change does not apply
until the new contact responds to a verification challenge.

**Rule 5 — No actor sets another user's password directly.**
Ever. Admins trigger a reset link. The user sets their own password through
the reset flow. This is non-negotiable and architecturally enforced by
never exposing a "set password" endpoint — only "send reset."

**Rule 6 — Role and department changes are not profile edits.**
They are administrative operations with their own endpoint, their own
permission, their own audit action, and their own notification to the
affected staff member. Do not put them on a profile edit form.

---

## Part 1 — Patient Data Editing

### 1.1 — What a Patient Can Edit About Themselves

These fields are available on the patient self-service portal
(`PortalDemographicsController`) to any authenticated user with role `patient`:

| Field | Notes |
|---|---|
| `first_name`, `last_name` | Name as used by the hospital |
| `phone_number` | Personal contact (not necessarily login phone) |
| `address` | Physical/postal address |
| `next_of_kin_name` | |
| `next_of_kin_phone` | |
| `next_of_kin_relationship` | |
| `preferred_language` | English / Swahili — affects notification language |
| `profile_photo` | Image upload — private disk, served via signed URL |

**What a patient explicitly cannot self-edit (API must reject these):**

| Field | Reason |
|---|---|
| `national_id` | SHA/NHIF legal field — admin path only |
| `date_of_birth` | Insurance and identity — admin path only |
| `email` (login) | Credential — goes through pending verification flow |
| `phone` (login/OTP) | Credential — goes through pending verification flow |
| `blood_group` | Clinical data — clinical staff only |
| `known_allergies` | Clinical data — nurse/doctor only |
| `account_status` | Administrative — Hospital Admin only |

**Gate for patient self-edit:**
- Permission: `portal.demographics.update` (already exists — confirm it is assigned)
- Current password must be confirmed in request body before save
- Every saved field fires an individual audit log row

---

### 1.2 — What Hospital Admin Can Edit on a Patient Profile

Hospital Admin reaches patients through `PatientController` (admin path),
not through the portal controller. After Fix 1 from doc `21` is applied,
this path calls `$this->authorize('manage', $patient)` which enforces
branch scope.

**Fields Hospital Admin can edit on a patient:**

| Field | Notes |
|---|---|
| `first_name`, `last_name` | Corrections from ID documents |
| `national_id` | Requires `sensitive_field: true` in audit log |
| `date_of_birth` | Requires `sensitive_field: true` in audit log |
| `phone_number` | Operational contact |
| `address` | |
| `next_of_kin_*` | All next of kin fields |
| `insurance_provider` | SHA/NHIF/private insurer |
| `insurance_number` | |
| `account_status` | Activate / Deactivate with mandatory reason |

**Fields Hospital Admin cannot edit on a patient (API must reject):**
- All clinical fields (blood group, allergies, diagnoses, prescriptions)
- Patient's login email or phone (they can trigger a reset — not a direct change)
- Patient's password (trigger reset only)

---

### 1.3 — The Two Patient Edit Endpoints — Contracts

**Self-Edit (Portal Path):**
```
PATCH /api/portal/demographics
Authorization: Bearer {patient_token}
Permission required: portal.demographics.update

Body (all fields optional — partial updates allowed):
{
  "current_password": "required — always",
  "first_name": "string|max:100",
  "last_name": "string|max:100",
  "phone_number": "string|ke_phone_format",
  "address": "string|max:500",
  "next_of_kin_name": "string|max:200",
  "next_of_kin_phone": "string|ke_phone_format",
  "next_of_kin_relationship": "string|max:100",
  "preferred_language": "in:en,sw"
}

Rejected fields (422 if present):
national_id, date_of_birth, email, blood_group, known_allergies
```

**Admin Edit (Admin Path):**
```
PATCH /api/patients/{uuid}
Authorization: Bearer {admin_token}
Permission required: patients.update
Policy required: PatientPolicy::manage() — branch scope enforced

Body (all fields optional):
{
  "first_name": "string|max:100",
  "last_name": "string|max:100",
  "national_id": "string|nullable — triggers sensitive audit flag",
  "date_of_birth": "date|nullable — triggers sensitive audit flag",
  "phone_number": "string|ke_phone_format",
  "address": "string|max:500",
  "insurance_provider": "string|nullable",
  "insurance_number": "string|nullable",
  "next_of_kin_name": "string|max:200",
  "next_of_kin_phone": "string|ke_phone_format",
  "next_of_kin_relationship": "string|max:100"
}

Rejected fields (422 if present):
blood_group, known_allergies, diagnoses, prescriptions, account_status
(account_status has its own dedicated endpoint — not mixed into profile update)
```

**Why `account_status` is rejected from the profile update endpoint:**
Deactivation is not a profile field. It is an administrative action with
mandatory reason logging. Mixing it into a PATCH profile request means
someone could slip a deactivation in alongside a phone number update
and the audit trail would be ambiguous. Separate endpoint. Separate intent.

---

## Part 2 — Staff Data Editing

Staff profiles have more complexity than patient profiles because they have
two ownership layers: personal data (self-owned) and employment data (admin-owned).
These must never be merged into a single update endpoint.

---

### 2.1 — What All Staff Can Edit About Themselves

Applies to: doctor, nurse, receptionist, pharmacist, lab_technician,
radiologist, cashier, records, hospital_admin (about themselves only).

**Self-editable fields:**

| Field | Notes |
|---|---|
| `first_name`, `last_name` | Legal name — current password required |
| `personal_phone` | Their own phone (not necessarily the one on staff record) |
| `home_address` | |
| `emergency_contact_name` | |
| `emergency_contact_phone` | |
| `profile_photo` | Private disk, signed URL |
| `bio` / `short_description` | Optional — for doctor-facing portal display |
| `preferred_language` | en / sw |

**Not self-editable by any staff member under any circumstance:**

| Field | Who Owns It |
|---|---|
| `role` | Hospital Admin only |
| `department_id` | Hospital Admin only |
| `staff_id` / `employee_number` | Hospital Admin only |
| `specialization` | Hospital Admin (confirmed by clinical lead) |
| `license_number` | Hospital Admin (verified against regulatory body) |
| `login_email` | Pending verification flow |
| `login_phone` | Pending verification flow |
| `account_status` | Hospital Admin / Superadmin |
| `salary` / `payroll_fields` | Hospital Admin / Superadmin |

**Gate for staff self-edit:**
- Permission: `profile.self.update.basic`
- Current password confirmation required in request body
- Fires audit log on every changed field with action: `self_updated`

---

### 2.2 — Staff Login Credential Changes (Email / Phone)

This is the most security-sensitive self-service action in the system.
It does not go through the basic profile update endpoint.

**Flow — Login Email Change:**

```
Step 1: Staff submits new email via PATCH /api/staff/profile/contact
        Body: { "field": "email", "new_value": "new@email.com", "current_password": "..." }

Step 2: System validates current_password. Rejects if wrong.

Step 3: System checks new email is not already in use by any other user.

Step 4: System creates a row in pending_contact_changes:
        { user_id, field: "email", new_value, token, expires_at: +24hrs }

Step 5: Sends verification link to new_email.
        Sends notification ("Someone requested to change your login email") to old_email.

Step 6: Staff clicks link in new email — token verified, change applied to users table.
        Old email receives confirmation: "Your login email has been changed."

Step 7: Audit log fires: action "contact_email_changed", old_value (masked), new_value (masked)

If the staff member did NOT request this change, the notification to the old email
is their alert. They contact Hospital Admin who can freeze the pending change.
```

**Flow — Login Phone Change:**
Same as above. OTP sent to new phone instead of a link.
Old phone receives an SMS notification.

---

### 2.3 — What Hospital Admin Can Edit on a Staff Profile

Hospital Admin accesses staff through the admin panel, not the staff portal.
Separate controller: `StaffAdminController` (to be built if it does not exist).

**Employment data — Hospital Admin can edit:**

| Field | Notes |
|---|---|
| `first_name`, `last_name` | Correction — triggers audit |
| `national_id` | Sensitive — audit flag required |
| `date_of_birth` | Sensitive — audit flag required |
| `staff_id` / `employee_number` | HR record |
| `department_id` | Operational assignment |
| `specialization` | For clinical staff |
| `license_number` | Must be verified against regulatory body before entry |
| `employment_type` | Full-time / Part-time / Locum / Contract |
| `employment_start_date` | |
| `account_status` | Via dedicated activate/deactivate endpoint only |

**Hospital Admin cannot edit on a staff profile:**
- `role` — Role changes go through a dedicated role assignment endpoint, not profile update
- `salary` / `payroll_fields` — Superadmin or Finance module only
- Another Hospital Admin's profile — peer editing blocked at policy level
- Any Superadmin's profile — blocked at policy level
- Login credentials directly — reset flow only

---

### 2.4 — Role Changes Are Not Profile Edits — Their Own Endpoint

**This is a hard architectural rule.**

Changing a staff member's role affects:
- Every permission they hold
- Every queue they appear in
- Every patient they can access
- Every audit log entry attributed to them going forward

A role change is a significant administrative event. It must:
- Have its own endpoint: `POST /api/admin/staff/{uuid}/role`
- Require `staff.role.assign` permission (separate from `staff.update`)
- Be impossible to sneak in alongside a name or phone update
- Fire an audit log with action `role_changed`, `old_role`, `new_role`
- Send an SMS/email notification to the affected staff member:
  *"Your role in Afya HMS has been updated to [new_role] by [admin_name]."*
- Immediately invalidate the user's current session so they log back in with new permissions

**Why session invalidation on role change?**
A user mid-session with old permissions should not continue operating
under those permissions after a role change. Stale permission caches
in Spatie are a real attack surface. Force re-login. Revoke their tokens.

---

### 2.5 — Staff Edit Endpoints — Contracts

**Staff Self-Edit (Basic):**
```
PATCH /api/staff/profile/basic
Authorization: Bearer {staff_token}
Permission required: profile.self.update.basic

Body:
{
  "current_password": "required",
  "first_name": "string|max:100",
  "last_name": "string|max:100",
  "personal_phone": "string|ke_phone_format",
  "home_address": "string|max:500",
  "emergency_contact_name": "string|max:200",
  "emergency_contact_phone": "string|ke_phone_format",
  "preferred_language": "in:en,sw"
}

Rejected fields (422 if present):
role, department_id, staff_id, license_number, account_status,
national_id, date_of_birth, email, salary
```

**Hospital Admin Edit Staff (Employment Data):**
```
PATCH /api/admin/staff/{uuid}/employment
Authorization: Bearer {admin_token}
Permission required: staff.update
Policy required: StaffPolicy::manage() — no peer Hospital Admin editing

Body:
{
  "first_name": "string|max:100",
  "last_name": "string|max:100",
  "national_id": "string|nullable",
  "date_of_birth": "date|nullable",
  "staff_id": "string|unique:users,staff_id,{uuid},uuid",
  "department_id": "exists:departments,id",
  "specialization": "string|nullable",
  "license_number": "string|nullable",
  "employment_type": "in:full_time,part_time,locum,contract",
  "employment_start_date": "date|nullable"
}

Rejected fields (422 if present):
role, account_status, salary, email, password, phone (login)
```

**Role Assignment (Separate Endpoint):**
```
POST /api/admin/staff/{uuid}/role
Authorization: Bearer {admin_token}
Permission required: staff.role.assign
Policy required: cannot assign Superadmin or Hospital Admin role

Body:
{
  "role": "in:doctor,nurse,receptionist,pharmacist,lab_technician,
           radiologist,cashier,records",
  "reason": "string|required|max:500"
}

Effects:
- Revokes all current Sanctum tokens for affected user
- Fires audit log: action "role_changed"
- Sends notification to affected staff member
```

---

## Part 3 — The Three-Section Profile UI Rule

Every profile page in this system — patient portal, staff portal, admin panel —
must use this three-section structure without exception.

### Section A — Self-Managed Information
Fields the logged-in user can edit directly.
Has an "Edit" button. Has a "Save" button that requires password confirmation.
Has inline validation. Has a success confirmation with timestamp.

### Section B — Credential & Security
Login email, login phone, password.
Each has its own isolated action (not part of the general edit form).
Email and phone show current value with a "Change" button that opens a
dedicated flow explaining that verification will be required.
Password shows only "Change Password" — no current value displayed.

### Section C — System-Assigned Information (Read-Only)
Role, department, staff ID, branch, account status, registration date.
Displayed as static text — not as disabled inputs.
Disabled inputs leak field names to the DOM and imply editability.
Static text communicates clearly: this section is not yours to change.
Include a single line at the bottom:
*"To update this information, contact Hospital Administration."*

**Do not merge these sections.** Do not make Section C editable based on
a role check in the frontend. The section is read-only for everyone viewing
their own profile. The admin panel is a completely separate surface.

---

## Part 4 — Audit Log Action String Reference

Every edit in this system produces an audit entry. Use these exact action
strings for consistency — your log filters and compliance reports depend on them.

| Action | Triggered By |
|---|---|
| `self_updated` | Any user editing their own basic profile fields |
| `admin_updated` | Hospital Admin editing a patient or staff profile |
| `superadmin_updated` | Superadmin editing any profile |
| `contact_email_changed` | Email change verified and applied |
| `contact_phone_changed` | Phone change verified and applied |
| `contact_change_requested` | Pending change created (not yet verified) |
| `contact_change_expired` | Pending change discarded after 24 hours |
| `contact_change_cancelled` | User cancelled their own pending change |
| `password_changed` | User changed their own password |
| `password_reset_triggered` | Admin triggered a reset for another user |
| `role_changed` | Admin changed a staff member's role |
| `department_changed` | Admin changed a staff member's department |
| `account_deactivated` | Account deactivated with reason |
| `account_reactivated` | Account reactivated |
| `sensitive_field_updated` | Any change to national_id or date_of_birth |
| `photo_updated` | Profile photo changed |

---

## Part 5 — What Does Not Exist Yet and Must Be Built

Cross-referencing against the current codebase state, these items are
confirmed missing and must be built as part of this feature:

### Backend (Laravel)
- [ ] `StaffProfileController` with `updateBasic()`, `updateContact()`, `updatePassword()`, `uploadPhoto()`
- [ ] `StaffAdminController` with `updateEmployment()` for Hospital Admin
- [ ] `POST /api/admin/staff/{uuid}/role` endpoint with session revocation
- [ ] `pending_contact_changes` migration and model
- [ ] `pending_contact_changes` cron purge job (Laravel Scheduler)
- [ ] `profile.self.update.basic` permission — add to seeder, assign to all roles
- [ ] `profile.self.update.contact` permission — add to seeder, assign to all roles
- [ ] `staff.role.assign` permission — add to seeder, assign to hospital_admin only
- [ ] `StaffPolicy::manage()` — ensure Hospital Admin cannot edit peer Hospital Admin
- [ ] `$this->authorize('manage', $patient)` in `PatientController::update()` — SHIPPED FIRST

### Frontend (React)
- [ ] Staff portal: Three-section profile page
- [ ] Staff portal: Contact change flow with pending state UI
- [ ] Staff portal: Password change with "all other devices signed out" feedback
- [ ] Patient portal: "My Profile" nav entry (currently missing from nav)
- [ ] Patient portal: Three-section profile page
- [ ] Admin panel: Staff employment data edit form (separate from role assignment)
- [ ] Admin panel: Role assignment UI with reason field and confirmation modal
- [ ] Admin panel: Patient profile edit form (sensitive fields visually distinguished)

### Notifications (AfricasTalking SMS)
- [ ] Contact change request confirmation SMS
- [ ] Contact change applied confirmation SMS
- [ ] Role change notification SMS to affected staff
- [ ] Account deactivation SMS
- [ ] Account reactivation SMS

---

## The One Question to Ask Before Every Edit Feature You Build

> *"If a malicious authenticated user hit this endpoint directly with crafted
> JSON, what is the worst thing they could do?"*

If the answer is anything worse than "update their own phone number" —
your FormRequest is not strict enough. Tighten it until the answer
is exactly what the feature is supposed to allow and nothing more.

---

*This document is part of the Afya HMS canonical decisions series.*
*Any implementation that deviates from this specification must update this
document first and justify the deviation in writing.*
*No deviation is permitted for the security rules in Part 1 or the
audit logging requirements in Part 4.*

# Afya HMS — Profile Editing Gaps: Diagnosis & Fix Plan

> **Document:** `21-profile-editing-fix-plan.md`
> **System:** Afya HMS — Laravel 11 + React/Vite
> **Status:** Active Fix Plan — Do Not Skip Steps
> **Relates to:** `19-roles-admin-vs-superadmin.md`, `20-user-data-editing-policy.md`

---

## Current State Audit — What Is Actually Broken

Two confirmed architectural violations exist in the current codebase.
Both must be fixed before any new feature work on profiles proceeds.

---

### Violation 1 — Branch Isolation Bypass in `PatientController::update()`

**What was found:**
`PatientController::update({uuid})` is guarded by the `patients.update` permission
but does **not** call `$this->authorize('manage', $patient)`.

**What this means in practice:**
`PatientPolicy::manage()` enforces branch-scoped access — a Hospital Admin at Branch A
cannot touch Branch B patients. But that check is never invoked on the update path.
Any authenticated user holding `patients.update` can edit **any patient record
in the entire system**, regardless of branch.

**Severity:** Critical. This is a live authorization bypass. It is not theoretical.

---

### Violation 2 — Self-Editing Does Not Exist for Staff or Patients (Except Password)

**What was found:**
No staff member (doctor, nurse, receptionist, etc.) can edit their own
personal/demographic data through the system. The same is true for patients
outside of `PortalDemographicsController`. The only self-service action
available system-wide is password change, and only Hospital Admin and
Superadmin can trigger even that for others.

**What this means in practice:**
- A nurse who changes her phone number cannot update it herself
- A doctor with a new address has no self-service path
- Staff must ask Hospital Admin to update basic personal information
- This creates an admin bottleneck for routine data and violates the
  principle established in `20-user-data-editing-policy.md`

**Severity:** High. This is a policy violation and an operational failure.
In a real hospital with 50+ staff, this makes Hospital Admin a full-time
data entry clerk.

---

## The Fix Plan — In Strict Order

Do not jump to step 3 because it feels more visible. Step 1 is a security fix.
It ships before anything else.

---

### Step 1 — Fix the Branch Isolation Bypass (Backend, 30 minutes)

**File:** `backend/app/Modules/Patients/Controllers/PatientController.php`

**Action:** Add the policy authorization call at the top of the `update()` method,
before any validation or persistence logic runs.

```php
public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
{
    $this->authorize('manage', $patient); // ADD THIS — activates branch-scope check

    // ... rest of existing logic unchanged
}
```

**Also check these methods in the same controller for the same missing call:**
- `show()` — can a Hospital Admin from Branch A view Branch B patient details?
- `destroy()` / `deactivate()` — same risk on deletion/deactivation paths
- Any other method that receives a `{uuid}` route parameter and operates on a patient

**Test it immediately after:** Log in as Hospital Admin of Branch A.
Attempt to update a patient UUID that belongs to Branch B via API client (Postman/Insomnia).
You must receive a `403 Forbidden`. If you receive a `200`, the fix did not take.

---

### Step 2 — Define the Self-Edit Permission Set

Before building any controller or UI, establish what self-editing means
in the permission system.

**New permissions to add to your permission seeder:**

```
profile.self.update.basic        — Edit own name, address, phone, next of kin
profile.self.update.contact      — Edit own login email or phone (triggers OTP flow)
profile.self.update.password     — Change own password
profile.self.upload.photo        — Upload/change own profile photo
```

**Assign these permissions to ALL roles** — patient, doctor, nurse, receptionist,
pharmacist, lab_technician, radiologist, cashier, records, hospital_admin, superadmin.

Every authenticated user in the system gets these four regardless of their
operational role. Self-editing is not a privilege — it is a baseline right.

**Sensitive fields get NO self-edit permission:**
- `national_id` — Hospital Admin path only
- `date_of_birth` — Hospital Admin path only, with audit flag
- `staff_id` / `employee_number` — Hospital Admin only
- `role` / `department` — Hospital Admin only
- `account_status` — Hospital Admin / Superadmin only

---

### Step 3 — Build the Staff Self-Edit Backend

**New controller:**
`backend/app/Modules/Staff/Controllers/StaffProfileController.php`

**Methods required:**

```
GET    /api/staff/profile              → show()     — Return own profile data
PATCH  /api/staff/profile/basic        → updateBasic()  — Name, address, phone, next of kin
PATCH  /api/staff/profile/contact      → updateContact() — Email/phone (triggers OTP)
PATCH  /api/staff/profile/password     → updatePassword() — Password change
POST   /api/staff/profile/photo        → uploadPhoto()
```

**Rules for `updateBasic()`:**
- Requires `profile.self.update.basic` permission
- Requires current password confirmation in request body
- Fires audit log entry on every field changed
- Returns the updated profile

**Rules for `updateContact()`:**
- Requires `profile.self.update.contact` permission
- Email change: send verification link to new email, send notification to old email
- Phone change: send OTP to new phone, send notification to old phone
- The change does NOT apply until the new contact is verified
- Store the pending change in a `pending_contact_changes` table until confirmed
- If unconfirmed after 24 hours, the pending change is discarded

**Rules for `updatePassword()`:**
- Requires current password in request
- On success: revoke ALL other active Sanctum tokens for this user
- Only the current session survives the password change
- Fire audit log: action `password_changed`, no value stored

**Rules for `uploadPhoto()`:**
- Validate: image only, max 2MB, JPEG/PNG/WEBP
- Store in private disk, serve via signed URL — not public
- Overwrite the old photo, do not accumulate versions

---

### Step 4 — Extend Patient Self-Edit Backend

`PortalDemographicsController` already exists and handles the patient self-edit path.
It needs two additions:

**Addition 1 — Sensitive field block:**
`date_of_birth` and `national_id` must be explicitly rejected from the
`PortalDemographicsController::update()` FormRequest validation.
If these fields arrive in the request body, return `422` with a clear message:
*"This field cannot be changed from the patient portal. Contact reception."*

This is not a UI concern — it must be enforced at the API layer.

**Addition 2 — Audit log verification:**
Confirm that `PortalDemographicsController::update()` fires the same
`AuditLogger` service call that the admin path fires. If it does not,
add it. Self-edits are not exempt from audit logging.

---

### Step 5 — Build the Staff Self-Edit UI

**Location:** Staff portal — accessible to all staff roles after login.

**Profile page structure — three distinct sections:**

#### Section A — Personal Information (self-editable)
Fields: Full name, personal phone, personal email (display only if also login),
home address, next of kin name, next of kin phone.

- Inline edit with Save/Cancel per field group
- Password confirmation modal before save fires
- Success toast confirms save and shows audit trail line:
  *"Profile updated on [date] at [time]"*

#### Section B — Account & Security (self-editable)
- Change password (current + new + confirm)
- Change login email (triggers OTP flow — clear UI explaining the verification step)
- Change login phone (same)
- Active sessions list — with "Sign out all other devices" button

#### Section C — Employment Information (read-only for staff)
Fields: Role, department, employee ID, branch, account status.
Display only. No edit controls visible. No disabled inputs — just static text.
Add a note: *"To update employment information, contact Hospital Administration."*

---

### Step 6 — Build the Hospital Admin Profile Management Panel

**This is separate from the staff self-edit UI. Do not merge them.**

Hospital Admin sees a staff list. For each staff member they can:
- Edit National ID, Date of Birth (with audit flag — these are sensitive)
- Edit role assignment
- Edit department assignment
- Force a password reset (triggers email/SMS link — does not set password directly)
- Activate / Deactivate account (existing capability — confirm it calls the policy)

**Hard limits enforced in the UI and the backend policy:**
- Hospital Admin cannot edit another Hospital Admin's profile
- Hospital Admin cannot edit Superadmin profiles
- Hospital Admin cannot see or modify authentication credentials directly

---

### Step 7 — The `pending_contact_changes` Table

This table does not exist yet. Create a migration for it.

**Schema:**

```
id                  — bigint, primary key
user_id             — foreign key → users.id
field               — enum('email', 'phone')
new_value           — string (the unverified new contact)
verification_token  — string (hashed OTP or signed token)
expires_at          — timestamp (24 hours from creation)
verified_at         — timestamp (null until confirmed)
created_at
updated_at
```

**Logic:**
- On `updateContact()` request: insert a row, send OTP/link, return 202 Accepted
- On verification: apply the new value to `users` table, mark `verified_at`, fire audit log
- A cron job (Laravel scheduler) purges unverified rows older than 24 hours
- A user can only have one pending change per field at a time — upsert, not insert

---

## What the Audit Log Must Capture for Self-Edits

Self-edits must be indistinguishable in the audit log from admin edits —
the only difference is `actor_id === subject_id` (the person edited their own record).

| Field | Self-Edit Value |
|---|---|
| `actor_id` | The user's own ID |
| `actor_role` | Their role |
| `action` | `self_updated` (distinct from `admin_updated` for easy log filtering) |
| `subject_type` | `User` or `Patient` |
| `subject_id` | Their own ID |
| `field_name` | The specific field changed |
| `old_value` | Previous value |
| `new_value` | New value |
| `ip_address` | Required |
| `user_agent` | Required |

Using `self_updated` as a distinct action string means you can filter your audit log
to show only self-edits vs admin-initiated changes — critical for a compliance report.

---

## What Not to Do

**Do not build a single "Edit Profile" page that renders different fields
based on role.** That approach leaks field names in the DOM even when
inputs are disabled. A nurse should never see a disabled `national_id` input —
they should not see the field at all.

**Do not skip the `pending_contact_changes` flow** and just update email/phone directly.
A compromised account changing the recovery email without verification is
a complete account takeover. The pending flow is the security boundary.

**Do not rely on the UI to block sensitive field edits.** The API must reject them.
UI is cosmetic. The FormRequest is the law.

**Do not merge Step 1 (security fix) into the same PR as Steps 3–7 (features).**
The authorization bypass is a hotfix. It ships alone, fast, and gets verified
before feature work begins.

---

## Build Order Summary

```
Step 1  →  Fix PatientController::update() policy call         [SECURITY - ships first]
Step 2  →  Add self-edit permissions to seeder & re-seed       [Foundation]
Step 3  →  StaffProfileController + routes + FormRequests      [Backend]
Step 4  →  PortalDemographicsController hardening              [Backend]
Step 5  →  Staff self-edit UI (3-section profile page)         [Frontend]
Step 6  →  Hospital Admin profile management panel             [Frontend]
Step 7  →  pending_contact_changes migration + cron purge      [Database + Scheduler]
```

Do not start Step 5 until Steps 1–4 are complete and tested.
Do not start Step 6 until Step 5 is working.
The backend must be bulletproof before the UI exists.

---

*This document is part of the Afya HMS canonical decisions series.*
*This fix plan supersedes any conflicting implementation decisions made prior to this document.*
*Step 1 is not optional and does not wait for team alignment — it is a security patch.*

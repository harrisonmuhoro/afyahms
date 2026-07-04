# Afya HMS — Hospital Admin vs Superadmin: Role Definitions & Boundaries

> **Document:** `19-roles-admin-vs-superadmin.md`
> **System:** Afya HMS — Laravel 11 + React/Vite
> **Status:** Canonical Reference
> **Relates to:** `18-canonical-decisions.md`

---

## Why This Document Exists

Afya HMS currently only has a **Superadmin** role, with no Hospital Administrator defined.
This is a structural gap — not a minor detail.

A single all-powerful role serving both *system-level* and *operational-level* responsibilities
is a security anti-pattern. It violates the **Principle of Least Privilege**, creates a
single point of failure, and makes the system unauditable in the context of Kenya's
**Data Protection Act 2019** and hospital compliance requirements.

This document canonically defines both roles, their scopes, their boundaries,
and the explicit line between them.

---

## Mental Model First

Before listing permissions, understand the conceptual split:

| Axis | Superadmin | Hospital Admin |
|---|---|---|
| **Concern** | The *system* | The *hospital* |
| **Thinks about** | Infrastructure, configuration, tenancy | Staff, patients, departments, operations |
| **Acts like** | A software vendor / IT root user | A hospital HR & Ops manager |
| **Frequency of use** | Rare — only when the system itself needs changes | Daily — routine hospital operations |
| **Should treat patient data?** | Almost never | Regularly, within scope |

If you blur this line, you end up with a Superadmin who routinely handles clinical
operations — which means your audit logs become meaningless and your system is
unauditable. One person should not hold both hats.

---

## Superadmin — Full Specification

### What Superadmin IS

The Superadmin is the **technical root** of the entire system.
In a real-world deployment, this is the software vendor, the CTO, or the lead developer —
not someone employed by the hospital.

Superadmin exists to:
- Bootstrap the system before any hospital exists in it
- Manage the configuration that no hospital staff should ever touch
- Provide emergency break-glass access when the system breaks

### Superadmin Capabilities

#### System Configuration
- Configure global system settings (application name, timezone, locale, maintenance mode)
- Manage environment-level toggles (feature flags, SMS gateway config, M-Pesa keys)
- Set system-wide defaults that cascade to all hospitals (e.g. session timeout, password policy)

#### Tenant / Hospital Management
- Create, configure, and destroy hospital tenants (if multi-tenant)
- Assign the first Hospital Admin account per hospital
- Set per-hospital feature entitlements (which modules are active)

#### Role & Permission Architecture
- Define the master permission list for the entire system
- Create and modify role templates
- Cannot be overridden by any other role in the system

#### Audit & Compliance
- Access all audit logs across all roles and all hospitals
- Pull compliance reports for regulatory submissions
- View security incident logs (failed logins, suspicious activity)

#### Account Management (System Level)
- Create, activate, deactivate, or delete Hospital Admin accounts
- Reset any user's credentials in an emergency
- Cannot be locked out — always retains at least one active Superadmin account

#### Emergency Break-Glass
- Override any permission check in a documented emergency
- Access any record temporarily with full audit logging of the override reason
- Revoke any active session system-wide

---

### Superadmin Hard Limits — What They Must NOT Do

These are not preferences. These are **architectural rules.**

| Prohibited Action | Reason |
|---|---|
| Routinely edit patient clinical records | Violates separation of clinical and administrative duties |
| Perform daily operational tasks (scheduling, billing) | Superadmin is not a hospital operations role |
| Act as a Hospital Admin | Conflation destroys your audit trail |
| Be the only account that activates staff | Creates an operational bottleneck that will collapse under real hospital load |
| Share credentials with Hospital Admin | Two roles exist precisely so two humans operate them |

> **Rule:** If a Superadmin is logging in more than once a week for routine hospital
> operational tasks, something is architecturally wrong.

---

## Hospital Admin — Full Specification

### What Hospital Admin IS

The Hospital Admin is the **operational root** of a specific hospital instance.
This is a real employee of the hospital — typically the IT Manager, Systems Administrator,
or Hospital Operations Manager. They do not touch system infrastructure.
They manage the hospital as an organization inside the system.

### Hospital Admin Capabilities

#### Staff Account Lifecycle
- Create accounts for all hospital staff (doctors, nurses, receptionists, etc.)
- Assign and change roles for any staff member (except Superadmin)
- Activate and deactivate staff accounts with a mandatory reason and timestamp
- Reset staff passwords (triggers a forced password change on next login)
- Cannot create another Hospital Admin — only Superadmin can do that

#### Department & Ward Management
- Create, edit, and archive hospital departments
- Assign staff to departments and wards
- Configure bed capacity per ward

#### Patient Account Management
- View all patient accounts
- Activate and deactivate patient accounts (with reason + audit log)
- Cannot edit patient clinical records — that belongs to clinical staff
- Can view patient demographic data for operational purposes
- Can trigger a patient account reset (email/phone update with verification)

#### Operational Configuration
- Configure hospital-specific settings (working hours, consultation fees, public holidays)
- Set up insurance providers and billing categories
- Configure SMS/notification templates for the hospital
- Manage M-Pesa Paybill/Till configuration specific to this hospital

#### Reporting & Oversight
- Generate operational reports (staff activity, appointment volumes, bed occupancy)
- View audit logs for their hospital (not system-wide)
- Cannot access audit logs of other hospitals (even in multi-tenant)

#### Module Access
- Access all non-clinical admin modules: HR, Billing, Scheduling, Inventory
- View (not edit) clinical module summaries for operational planning (e.g. bed occupancy)

---

### Hospital Admin Hard Limits — What They Must NOT Do

| Prohibited Action | Reason |
|---|---|
| Access system-level configuration | That belongs to Superadmin exclusively |
| Create or manage other Hospital Admin accounts | Only Superadmin can promote to this level |
| Edit clinical records (diagnoses, prescriptions, labs) | Clinical data has its own chain of custody |
| Deactivate a Superadmin account | Architecturally impossible — enforced at the gate level |
| Access multi-tenant audit logs across hospitals | Data isolation is non-negotiable |
| Override clinical staff permissions | Administrative and clinical authority are separate chains of command |

---

## Side-by-Side Comparison

| Capability | Superadmin | Hospital Admin |
|---|---|---|
| System configuration | ✅ Full | ❌ None |
| Create Hospital Admin accounts | ✅ | ❌ |
| Create staff accounts | ✅ (emergency only) | ✅ Primary owner |
| Assign roles to staff | ✅ | ✅ (excluding Superadmin/HospAdmin) |
| Activate / Deactivate staff | ✅ | ✅ |
| Activate / Deactivate patients | ✅ | ✅ |
| Edit patient demographic data | ✅ (emergency) | ✅ (operational) |
| Edit patient clinical records | ⚠️ Break-glass + audit only | ❌ |
| Department management | ❌ | ✅ |
| Hospital-specific config | ❌ | ✅ |
| System-wide audit logs | ✅ | ❌ |
| Hospital-scoped audit logs | ✅ | ✅ |
| Feature flags / tenant setup | ✅ | ❌ |
| M-Pesa / AfricasTalking config | ✅ (global keys) | ✅ (hospital-level keys) |
| View clinical summaries (read-only) | ✅ | ✅ (operational, non-clinical) |
| Break-glass override | ✅ | ❌ |
| Deactivate own account | ❌ (system blocks this) | ❌ (system blocks this) |
| Last Superadmin protection | ✅ Enforced | N/A |

---

## Account Activation & Deactivation — Shared Rules

Both Superadmin and Hospital Admin can activate/deactivate accounts,
but the following rules apply **without exception** to both:

1. **No self-deactivation** — The system must block any user from deactivating their own account at the policy/gate level, not just the UI.

2. **Deactivation requires a reason** — The `reason` field is not optional. It must be stored with the action record. Audits will ask why.

3. **Deactivation is not deletion** — Accounts are soft-deactivated. The record persists. Deletion is a separate, irreversible action that requires Superadmin and an audit entry.

4. **Session invalidation is immediate** — When an account is deactivated, all active tokens and sessions for that user are revoked instantly. Not on next login. Instantly. Any pending queue jobs for that user should also be evaluated.

5. **Reactivation triggers a notification** — The user must be notified via SMS or email when their account is reactivated, with a timestamp and the actor who reactivated them.

6. **Last Superadmin protection** — The system must enforce that at least one active Superadmin always exists. Deactivating the last one must fail at the system level.

7. **Hospital Admin cannot touch Superadmin accounts** — Enforced at the policy layer, not just the UI.

---

## What You Must Build Next

Based on this document, the immediate action items for Afya HMS are:

- [ ] Create the `HospitalAdmin` role in your Spatie RBAC permission seeder
- [ ] Define the `HospitalAdmin` permission set against the master permission list
- [ ] Add a `deactivated_reason` and `deactivated_at` field to the `users` table (migration)
- [ ] Add a `deactivated_by` foreign key referencing `users.id`
- [ ] Implement session/token invalidation on deactivation (revoke Sanctum tokens)
- [ ] Write the `HospitalAdminPolicy` with explicit Superadmin-level blocks
- [ ] Seed one Hospital Admin account alongside your Superadmin in `DatabaseSeeder`
- [ ] Add last-Superadmin guard in the deactivation service

---

*This document is part of the Afya HMS canonical decisions series.*
*Conflicts with this document must be resolved by updating this file, not by working around it.*

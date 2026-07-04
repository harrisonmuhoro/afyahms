# 🔐 Role: Superadmin
> **Scope:** God-mode access across the entire Afya HMS platform — all branches, all modules, all data.  
> **Accountability:** Highest. Every action is logged, auditable, and irreversible in spirit even if rollback-capable technically.

---

## ✅ DO's

### System Configuration
- **DO** configure global system settings (hospital name, branches, timezone, currency) only through the admin settings panel — never by editing `.env` directly on production.
- **DO** maintain a changelog entry for every system-wide configuration change, even minor ones.
- **DO** define and enforce naming conventions for branches, departments, and stations before any branch goes live.
- **DO** set up role templates centrally so branch admins inherit consistent permission sets.
- **DO** periodically audit all active roles and permissions across every branch to detect privilege creep.

### User & Access Management
- **DO** assign roles using the principle of least privilege — even if a user asks for broader access, scope it to what their job actually requires.
- **DO** enforce strong password policies and 2FA for all clinical and administrative roles.
- **DO** immediately disable (not delete) accounts for departed staff and document the reason.
- **DO** log every permission change with a timestamp and the superadmin's identity.
- **DO** use soft-delete for all user accounts so audit trails remain intact.

### Data & Security
- **DO** ensure all PHI (Protected Health Information) is encrypted at rest and in transit.
- **DO** schedule and verify database backups daily — verify restorability monthly.
- **DO** monitor system logs for anomalous access patterns (bulk downloads, off-hour logins, repeated failed auths).
- **DO** maintain an immutable audit trail for all financial and clinical records.
- **DO** conduct quarterly security audits across all modules.

### Multi-Branch Operations
- **DO** validate that each branch has its own isolated queue stations, departments, and bed configs before going live.
- **DO** enforce branch-level data segregation — staff from Branch A must never see Branch B patient data unless explicitly cross-authorized.
- **DO** review and approve any new branch setup before activating it for operations.

---

## ❌ DON'Ts

### Access & Power Misuse
- **DON'T** use the superadmin account for day-to-day tasks — create a personal admin account for regular work and reserve superadmin for system-level operations only.
- **DON'T** share the superadmin credentials with anyone — not even other admins. Ever.
- **DON'T** grant wildcard permissions (`*`) to hospital-admin or clinical roles — explicitly enumerate what they can access.
- **DON'T** create "temporary" superadmin accounts for other users — use time-bound, scoped permissions instead.

### Data Handling
- **DON'T** hard-delete any patient, financial, or audit record — ever. Use soft deletes and archival.
- **DON'T** run raw SQL mutations on production without a tested rollback plan and peer review.
- **DON'T** export bulk patient data without an auditable justification tied to a user request or legal mandate.
- **DON'T** bypass the application layer to patch data directly in the database — it breaks audit trail integrity.

### System Changes
- **DON'T** push configuration changes during peak hours — schedule maintenance windows.
- **DON'T** activate a new module system-wide without branch-level testing first.
- **DON'T** disable a module while it has active/in-progress records attached to it.
- **DON'T** ignore failed backup reports — a silent backup failure is a ticking time bomb.

---

## ⚠️ Critical Reminders
- You are the **last line of defense** — the system has no safety net above you.
- Every action you take is a **precedent** for how the system behaves.
- "I'll fix it later" doesn't exist at this level. Fix it now or document why you didn't.

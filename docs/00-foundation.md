# 00 — Foundation & Canonical Decisions

> **Authority:** This document is the single source of truth for cross-cutting decisions.
> Every other deliverable (01–27) MUST stay consistent with the constants defined here.
> If any document contradicts this file, this file wins.

**Product name:** Afya HMS (working title)
**Context:** Private multi-branch hospital, Kenya. 100–300 patients/day. 1,000 users now, architected for 10,000+.
**Document version:** 1.0 · **Status:** MVP architecture baseline

---

## 1. Architecture style

- **Modular Monolith.** One deployable Laravel application, internally split into bounded modules. No microservices.
- Backend: **Laravel 11 / PHP 8.3+**, REST API only (no Blade UI except mail/PDF templates).
- Frontend: **React 18 + TypeScript (strict) + Vite**, separate SPA/PWA, consumes REST API.
- **MySQL 8+** primary datastore. **Redis** for cache, sessions, queues, broadcasting, queue-management real-time state.
- Deployment: hybrid (local-dev friendly, cloud-ready) via Docker + Docker Compose.

### Module list (backend bounded contexts)
`Auth`, `Tenancy` (branches), `Patients`, `Appointments`, `Queue`, `Triage`, `EMR`, `ClinicalAlerts`, `Pharmacy`, `Laboratory`, `Radiology`, `Billing`, `Insurance` (SHA), `Inpatient`, `Inventory`, `Reporting`, `Communication`, `PatientPortal`, `Documents` (storage), `Audit`, `Admin`.

---

## 2. Canonical layered architecture (backend)

Request flow, enforced in every module:

```
Route → Controller → FormRequest (validation)
      → Service (business logic, orchestration, transactions)
      → Repository (persistence abstraction over Eloquent)
      → Model (Eloquent)
DTOs carry data across boundaries. Resources shape JSON responses.
Events fire side-effects (notifications, audit, alerts) via Listeners/Queues.
```

- **Repository Pattern** — interface + Eloquent implementation, bound in a service provider.
- **Service Layer** — all business rules; controllers stay thin.
- **DTO Pattern** — typed data objects in/out of services (`spatie/laravel-data`).
- **Form Request Validation** — all write endpoints. No validation in controllers.
- **SOLID** throughout. No duplicated logic; shared logic lives in services/actions/traits.

---

## 3. Canonical identifiers & formats

| Entity | Format | Example | Notes |
|---|---|---|---|
| Patient number | `PAT-YYYY-000001` | `PAT-2026-000042` | Per-year sequence, zero-padded 6. **Never** National ID as PK. |
| Invoice number | `INV-{BRANCH}-YYYY-000001` | `INV-NRB-2026-001934` | Per-branch, per-year. |
| Receipt number | `RCP-{BRANCH}-YYYY-000001` | `RCP-NRB-2026-001120` | |
| Lab sample ID | `LAB-{BRANCH}-YYMMDD-0001` | `LAB-NRB-260622-0007` | Barcoded. |
| Radiology study | `RAD-{BRANCH}-YYMMDD-0001` | `RAD-NRB-260622-0003` | |
| Prescription | `RX-{BRANCH}-YYYY-000001` | `RX-NRB-2026-008812` | QR-coded. |
| Queue ticket | `{DEPT}-{NNN}` (daily reset) | `TRI-014`, `DOC-007` | Per department, per day. |
| Admission no. | `ADM-{BRANCH}-YYYY-00001` | `ADM-NRB-2026-00231` | |
| Purchase order | `PO-{BRANCH}-YYYY-0001` | `PO-NRB-2026-0044` | |
| SHA claim | `CLM-{BRANCH}-YYYY-00001` | `CLM-NRB-2026-00098` | |

- All primary keys: `BIGINT UNSIGNED AUTO_INCREMENT` **or** UUID (`char(36)`) for externally-exposed resources (patients, documents). Default to BIGINT internally; expose via `public_id` UUID where leakage of sequence is undesirable.
- All money: `DECIMAL(12,2)`, currency `KES`. Never floats.
- All timestamps: UTC in DB, rendered in `Africa/Nairobi` (UTC+3). `created_at`, `updated_at`, soft-delete `deleted_at` on all domain tables.

---

## 4. Multi-branch (tenancy) rule

- Single shared database; **row-level isolation** by `branch_id`.
- Every operational table carries `branch_id BIGINT UNSIGNED` FK → `branches.id` (except global reference data: drug catalog master, ICD-10, system settings, roles/permissions).
- Global `BranchScope` Eloquent global scope auto-filters by the user's active branch; bypassable only by roles with `branch.view-all` (Hospital Admin, executive reporting).
- `branches`: id, code (e.g. `NRB`), name, address, phone, timezone, is_active.
- Users belong to one home branch, may be granted access to multiple; **branch switcher** in UI sets `active_branch_id` in session/token claim.

---

## 5. Roles (10) — canonical slugs

| # | Role | slug |
|---|---|---|
| 1 | Hospital Admin | `hospital-admin` |
| 2 | Doctor | `doctor` |
| 3 | Nurse | `nurse` |
| 4 | Receptionist | `receptionist` |
| 5 | Records Officer | `records-officer` |
| 6 | Pharmacist | `pharmacist` |
| 7 | Lab Technician | `lab-technician` |
| 8 | Radiologist | `radiologist` |
| 9 | Cashier/Accountant | `cashier` |
| 10 | Patient | `patient` |

- RBAC via **Spatie Laravel Permission**. Permissions named `{module}.{action}` (e.g. `patients.create`, `prescriptions.dispense`). Full matrix in `08-rbac-matrix.md`.
- **MFA required** for `hospital-admin`, `doctor`, `pharmacist`.

---

## 6. Patient number / sequence generation

- Dedicated `sequences` table (`scope` e.g. `patient:2026`, `invoice:NRB:2026`, `value`), incremented inside a DB transaction with `SELECT ... FOR UPDATE` to guarantee gap-tolerant uniqueness under concurrency. A `SequenceService` is the only writer.

---

## 7. Storage driver abstraction

- `StorageManager` with drivers: `local` (MVP default), `s3`, `r2`, `b2`. Configured in `config/filesystems.php` + `config/storage.php`. App code calls a `DocumentService` / `Storage::disk(config('storage.default'))`; never references a concrete provider.
- All clinical files served via **time-limited signed URLs**; no public buckets.

---

## 8. Notification abstraction

- `NotificationChannelManager` with providers: SMS = **AfricasTalking**; Email = **Mailgun** or **Resend** (configurable). Laravel Notifications + custom channels. Provider chosen via `config/notifications.php`. Code never calls a provider SDK directly.

---

## 9. Payments

- **M-Pesa Daraja**: STK Push, Paybill, Till. `PaymentGateway` interface; `MpesaDarajaGateway` impl; `CashGateway` impl. Callbacks via signed webhook routes, idempotent by `CheckoutRequestID`/`mpesa_receipt`.
- **SHA**: `InsurerGateway` interface, `ShaGateway` impl — claims, pre-auth, tracking. Abstraction allows future insurers.

---

## 10. Frontend canonical decisions

- Feature-based folders under `src/features/{feature}`. Shared UI in `src/components/ui`.
- **State:** TanStack Query for server state; **Zustand** for client/UI state (theme, active branch, queue board filters).
- **Forms:** React Hook Form + **Zod** resolvers. Zod schemas mirror backend FormRequests.
- **Routing:** React Router v6, route-level code splitting, `<ProtectedRoute permission="...">` guards.
- **i18n:** react-i18next, namespaces per feature, `en` + `sw` (Kiswahili). No hardcoded user-facing strings.
- **Theme:** light/dark via Tailwind `class` strategy, persisted in `localStorage` + Zustand.
- **Icons:** centralized SVG icon registry (`src/components/icons`), one `<Icon name="..."/>` component. **No emojis.**
- **No inline CSS, no inline JS handlers with logic.** Tailwind utility classes + extracted hooks.
- **PWA:** Vite PWA plugin, service worker, offline shell + cached read data, background sync for queued writes.
- Charts: **Recharts**. Calendar: **FullCalendar**.

---

## 11. Security & compliance baseline

- Auth: **Laravel Sanctum** (SPA token). Password expiry, idle session timeout, device + IP tracking, login history, OTP, MFA (TOTP) for privileged roles.
- Encryption at rest for sensitive columns (Laravel encrypted casts) + DB/volume encryption in prod. TLS in transit. CSRF protection, rate limiting, signed URLs, secure headers.
- **Audit**: Spatie Activity Log for model changes + a dedicated immutable `audit_logs` write for security/PHI access events.
- **Compliance**: Kenya **Data Protection Act 2019**, MOH requirements, HIPAA principles where practical. **Medical record retention ≥ 10 years** (soft-delete + archival, never hard-delete clinical data).

---

## 12. Triage standard

- **Manchester Triage System**: Red (immediate), Orange (very urgent ≤10 min), Yellow (urgent ≤60 min), Green (standard ≤120 min), Blue (non-urgent ≤240 min). Drives queue priority + emergency bypass.

---

## 13. Queue pipeline (canonical)

`Reception → Triage → Doctor → Lab → Pharmacy → Billing` — directed, skippable per visit type. Real-time via Redis + Laravel Broadcasting (WebSockets). Priority + emergency bypass honored at every station.

---

## 14. Naming & quality conventions

- PHP: PSR-12, Pint. Classes `PascalCase`, methods `camelCase`, DB tables `snake_case` plural.
- TS: ESLint + Prettier, strict mode, no `any` (use `unknown` + narrowing). Components `PascalCase`, hooks `useX`.
- Git: **Conventional Commits**, Husky pre-commit (lint, type-check, tests), CI gates.
- Tests: backend Pest/PHPUnit (unit/feature/integration), frontend Vitest + RTL + Playwright E2E. Target **≥80% coverage**.

---

## 15. Glossary

EMR (Electronic Medical Record), SOAP (Subjective/Objective/Assessment/Plan), SHA (Social Health Authority — Kenya), MTS (Manchester Triage System), GRN (Goods Received Note), PO (Purchase Order), STK (SIM Toolkit / M-Pesa push), RBAC (Role-Based Access Control), PWA (Progressive Web App), DTO (Data Transfer Object).

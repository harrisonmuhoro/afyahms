# 16 — Project Folder Structure

> **Authority:** Subordinate to `00-foundation.md`. Where this document and the foundation
> disagree, the foundation wins. This document is the canonical, buildable layout of the
> Afya HMS repository. Every file/folder created in the codebase MUST have a home defined here.

**Product:** Afya HMS · **Context:** Private multi-branch hospital, Kenya · 100–300 patients/day · 1,000 users now, architected for 10,000+.
**Stack:** Laravel 11 / PHP 8.3+ (modular monolith) · React 18 + TypeScript (strict) + Vite (SPA/PWA) · MySQL 8+ · Redis · Docker.
**Document version:** 1.0 · **Status:** Architecture baseline

---

## Table of contents

1. [Guiding principles for the layout](#1-guiding-principles-for-the-layout)
2. [Repository top level](#2-repository-top-level)
3. [`backend/` — Laravel 11 modular monolith](#3-backend--laravel-11-modular-monolith)
   1. [`backend/` top level](#31-backend-top-level)
   2. [`backend/app/` — non-module application skeleton](#32-backendapp--non-module-application-skeleton)
   3. [`backend/app/Modules/{Module}/` — the canonical module anatomy](#33-backendappmodulesmodule--the-canonical-module-anatomy)
   4. [Full module list expanded](#34-full-module-list-expanded)
   5. [`backend/config/` — configuration files](#35-backendconfig--configuration-files)
   6. [`backend/database/` — migrations, factories, seeders](#36-backenddatabase--migrations-factories-seeders)
   7. [`backend/routes/` — per-module route files](#37-backendroutes--per-module-route-files)
   8. [`backend/tests/` — Unit / Feature / Integration](#38-backendtests--unit--feature--integration)
   9. [`backend/storage/`, `bootstrap/`, `public/`](#39-backendstorage-bootstrap-public)
4. [`frontend/` — React feature-based SPA/PWA](#4-frontend--react-feature-based-spapwa)
   1. [`frontend/` top level](#41-frontend-top-level)
   2. [`frontend/src/app/` — composition root](#42-frontendsrcapp--composition-root)
   3. [`frontend/src/features/{feature}/` — canonical feature anatomy](#43-frontendsrcfeaturesfeature--canonical-feature-anatomy)
   4. [Full feature list expanded](#44-full-feature-list-expanded)
   5. [`frontend/src/components/`, `lib/`, `hooks/`, `providers/`, `i18n/`](#45-frontendsrccomponents-lib-hooks-providers-i18n)
   6. [`frontend/tests/` and `frontend/public/` (PWA)](#46-frontendtests-and-frontendpublic-pwa)
5. [`docker/` — container build context](#5-docker--container-build-context)
6. [`.github/`, `.husky/`, `Makefile`, root config](#6-github-husky-makefile-root-config)
7. [`docs/` — architecture & specification set](#7-docs--architecture--specification-set)
8. [Naming & placement rules (enforced)](#8-naming--placement-rules-enforced)
9. [Separation-of-concerns matrix (what goes where)](#9-separation-of-concerns-matrix-what-goes-where)

---

## 1. Guiding principles for the layout

These rules govern where every file lives. They are not stylistic; they are enforced by code review, lint, and CI.

| # | Principle | Consequence for the tree |
|---|---|---|
| 1 | **Bounded modules own their code.** | Backend domain code lives under `app/Modules/{Module}`, never in a flat `app/Http/Controllers`. Cross-module calls go through the owning module's **public Service/Contract**, never its Repository or Model. |
| 2 | **One layer = one folder = one responsibility.** | A class lives in exactly the folder of its layer (`Controllers`, `Services`, `Repositories`, `DTOs`, `Requests`, `Resources`, `Models`, `Events`, `Listeners`, `Jobs`, `Policies`, `Observers`). No "mixed" folders, no business logic in controllers, no SQL in services. |
| 3 | **Frontend is feature-based, not type-based.** | A screen's components, hooks, API calls, schemas, and i18n live together under `src/features/{feature}`. Only genuinely shared, domain-agnostic code goes to `src/components/ui`, `src/lib`, `src/hooks`. |
| 4 | **Abstraction folders, not vendor folders.** | Storage, notifications, payments, insurance live behind `Support/{Manager}` + `Contracts/` interfaces with `Drivers/` implementations. App code references the abstraction; swapping AfricasTalking → other SMS provider touches one driver file. |
| 5 | **Config is centralized and named by concern.** | One `config/*.php` per cross-cutting concern (`storage.php`, `notifications.php`, `mpesa.php`, `sha.php`, `alerts.php`, `branding.php`, `hospital.php`). No magic constants in code. |
| 6 | **Tests mirror the source tree.** | `tests/Unit`, `tests/Feature`, `tests/Integration` shadow module paths so any class's test is discoverable by convention. |
| 7 | **Infra lives at the root, not inside app code.** | `docker/`, `docker-compose.yml`, `.github/`, `.husky/`, `Makefile`, `.env.example` files are repo-root concerns shared by both apps. |

---

## 2. Repository top level

The monorepo holds two deployables (`backend`, `frontend`) plus shared infrastructure and documentation.

```text
afya-hms/                              # repository root (monorepo: two deployables + infra + docs)
├── backend/                           # Laravel 11 modular-monolith API (see §3)
├── frontend/                          # React 18 + TS + Vite SPA/PWA (see §4)
├── docs/                              # Architecture & spec set 00–27 (see §7)
│
├── docker/                            # Dockerfiles + service configs, build context for compose (see §5)
├── docker-compose.yml                 # Local/dev orchestration: app, nginx, mysql, redis, queue, scheduler, ws, mailpit
├── docker-compose.prod.yml            # Production overrides (no source mounts, replicas, healthchecks, secrets)
│
├── .github/                           # CI/CD + repo automation (see §6)
│   ├── workflows/                     # GitHub Actions pipelines
│   │   ├── backend-ci.yml             # PHP: Pint, PHPStan, Pest (unit/feature/integration), coverage gate ≥80%
│   │   ├── frontend-ci.yml            # TS: ESLint, tsc --noEmit, Vitest, Playwright, build, coverage gate ≥80%
│   │   ├── docker-build.yml           # Build & push images (backend, frontend) to registry on tag/main
│   │   ├── deploy-staging.yml         # Deploy on merge to main → staging
│   │   ├── deploy-production.yml      # Manual/approved deploy on release tag → production
│   │   ├── security-scan.yml          # Trivy image scan, composer audit, npm audit, secret scan
│   │   └── codeql.yml                 # Static security analysis (PHP-disabled note: JS/TS)
│   ├── ISSUE_TEMPLATE/                # Bug / feature / chore issue templates
│   ├── PULL_REQUEST_TEMPLATE.md       # PR checklist (tests, docs, conventional commit, breaking change)
│   ├── CODEOWNERS                     # Review routing per path (backend/* , frontend/* , docs/*)
│   └── dependabot.yml                 # Dependency update automation (composer, npm, docker, actions)
│
├── .husky/                            # Git hooks (Conventional Commits + pre-commit gates, see §6)
│   ├── pre-commit                     # lint-staged: Pint + ESLint/Prettier on staged files
│   ├── commit-msg                     # commitlint: enforce Conventional Commits
│   └── pre-push                       # fast type-check + affected unit tests before push
│
├── Makefile                           # One-word developer commands (up, down, test, lint, migrate, fresh, seed)
├── .editorconfig                      # Cross-editor whitespace/charset rules (PHP + TS share)
├── .gitignore                         # Ignore vendor, node_modules, .env, build artifacts, storage logs
├── .gitattributes                     # LF normalization, linguist overrides, export-ignore
├── commitlint.config.cjs              # Conventional Commits rule config used by .husky/commit-msg
├── LICENSE                            # Proprietary / chosen license
└── README.md                         # Repo entry: quickstart, architecture map, links into docs/
```

> **Note on `.env.example` files.** There is **no single root `.env`**. Each deployable owns its environment contract:
> `backend/.env.example` and `frontend/.env.example` (§3.1, §4.1). Compose reads `backend/.env` and
> `frontend/.env` plus a small root `.env.example` for **compose-only** variables (ports, image tags).

```text
afya-hms/
├── .env.example                       # Compose-only vars: host ports, image tags, COMPOSE_PROJECT_NAME
└── (backend/.env.example, frontend/.env.example own the app-level contracts)
```

---

## 3. `backend/` — Laravel 11 modular monolith

One deployable Laravel application. Domain code is split into **bounded modules** under `app/Modules/{Module}`.
The default Laravel `app/Http/Controllers` flat layout is **not used** for domain features.

### 3.1 `backend/` top level

```text
backend/                               # Laravel 11 application root (single deployable API)
├── app/                               # Application code: skeleton + Modules (see §3.2, §3.3)
├── bootstrap/                         # Framework bootstrap (app.php, providers.php, cached files) (see §3.9)
├── config/                            # Centralized config, one file per concern (see §3.5)
├── database/                          # Migrations (grouped), factories, seeders (see §3.6)
├── lang/                              # Backend translation strings (validation/mail/PDF — en, sw)
│   ├── en/                            # English source strings
│   └── sw/                            # Kiswahili strings
├── public/                            # Web server document root (index.php, robots.txt, build assets) (see §3.9)
├── resources/                         # Server-rendered templates ONLY (no SPA here)
│   ├── views/                         # Blade used strictly for mail + PDF (per foundation: no Blade UI)
│   │   ├── mail/                      # Notification email templates (invoice, appointment, OTP, results-ready)
│   │   └── pdf/                       # PDF templates (invoice, receipt, prescription, lab report, discharge)
│   └── lang/                          # (optional) JSON translation files if used by mail/pdf
├── routes/                            # Per-module API route files + channels/console (see §3.7)
├── storage/                           # Framework + app storage (logs, cache, local document disk) (see §3.9)
├── tests/                             # Unit / Feature / Integration mirroring modules (see §3.8)
│
├── artisan                            # Laravel CLI entrypoint
├── composer.json                      # PHP dependencies + PSR-4 autoload (App\Modules\* mapping)
├── composer.lock                      # Locked dependency versions
├── phpunit.xml                        # Pest/PHPUnit suites: Unit, Feature, Integration + coverage config
├── pint.json                          # Laravel Pint (PSR-12) formatter ruleset
├── phpstan.neon                       # PHPStan / Larastan level + paths (static analysis gate)
├── .env.example                       # Backend env contract: DB, Redis, Sanctum, queues, drivers, secrets keys
├── .env.testing                       # Test env (sqlite/mysql test DB, array drivers) used by CI
└── .gitignore                         # vendor/, .env, storage/*.log, bootstrap/cache/*
```

### 3.2 `backend/app/` — non-module application skeleton

Everything here is **cross-cutting framework wiring** and **shared abstractions**. No single module's business
rules live here. This is the only non-`Modules` part of `app/`.

```text
backend/app/
├── Modules/                           # ALL bounded-context domain code (see §3.3, §3.4)
│
├── Console/
│   ├── Kernel.php                     # Schedule registration (delegates to module Console commands)
│   └── Commands/                      # Only truly global commands (e.g. app:health-check)
│
├── Exceptions/
│   ├── Handler.php                    # Global exception → JSON API error mapping (RFC7807-style)
│   └── Domain/                        # Shared domain exception base classes (e.g. DomainException)
│
├── Http/
│   ├── Kernel.php                     # Global + route middleware groups registration
│   ├── Middleware/                    # CROSS-CUTTING middleware only (not module business logic)
│   │   ├── Authenticate.php           # Sanctum auth guard
│   │   ├── SetActiveBranch.php        # Resolves active_branch_id from token claim → request context
│   │   ├── EnforceBranchScope.php     # Ensures BranchScope is active unless branch.view-all
│   │   ├── EnsureMfaConfirmed.php     # Blocks privileged roles until TOTP confirmed
│   │   ├── ForceJsonResponse.php      # API always negotiates application/json
│   │   ├── IdleSessionTimeout.php     # Idle timeout enforcement per security baseline
│   │   ├── LogPhiAccess.php           # Writes immutable audit entry on PHI-read routes
│   │   └── SecureHeaders.php          # CSP, HSTS, X-Frame-Options, etc.
│   └── Controllers/
│       └── Controller.php             # Thin abstract base controller (no domain logic)
│
├── Providers/
│   ├── AppServiceProvider.php         # Core bindings
│   ├── AuthServiceProvider.php        # Gate/policy aggregation across modules
│   ├── BroadcastServiceProvider.php   # Channel auth (queue boards, alerts)
│   ├── EventServiceProvider.php       # Aggregates per-module event→listener maps
│   ├── RouteServiceProvider.php       # Loads routes/api/*.php per module, rate limiters
│   └── ModuleServiceProvider.php      # Auto-discovers & registers each Modules/{Module}/Providers
│
├── Support/                           # SHARED cross-cutting abstractions (the foundation's managers)
│   ├── Storage/
│   │   ├── StorageManager.php         # Driver selector reading config/storage.php
│   │   ├── Contracts/
│   │   │   └── StorageDriver.php      # Interface app code depends on
│   │   └── Drivers/
│   │       ├── LocalDriver.php        # MVP default
│   │       ├── S3Driver.php           # AWS S3
│   │       ├── R2Driver.php           # Cloudflare R2
│   │       └── B2Driver.php           # Backblaze B2
│   ├── Notifications/
│   │   ├── NotificationChannelManager.php   # Reads config/notifications.php
│   │   ├── Contracts/
│   │   │   ├── SmsProvider.php
│   │   │   └── EmailProvider.php
│   │   └── Channels/
│   │       ├── AfricasTalkingSmsChannel.php  # SMS provider
│   │       ├── MailgunEmailChannel.php       # Email provider
│   │       └── ResendEmailChannel.php        # Alternate email provider
│   ├── Payments/
│   │   ├── Contracts/
│   │   │   └── PaymentGateway.php     # STK/Paybill/Till + cash abstraction
│   │   └── Gateways/
│   │       ├── MpesaDarajaGateway.php # Reads config/mpesa.php
│   │       └── CashGateway.php
│   ├── Insurance/
│   │   ├── Contracts/
│   │   │   └── InsurerGateway.php     # Claims/pre-auth/tracking abstraction
│   │   └── Gateways/
│   │       └── ShaGateway.php         # Reads config/sha.php
│   ├── Sequences/
│   │   └── SequenceService.php        # SOLE writer of sequences table (FOR UPDATE) per foundation §6
│   ├── Tenancy/
│   │   ├── BranchScope.php            # Global Eloquent scope auto-filtering by branch_id
│   │   └── BranchContext.php          # Request-scoped active branch holder
│   ├── Dto/
│   │   └── BaseData.php               # spatie/laravel-data base class for all module DTOs
│   ├── Repositories/
│   │   ├── BaseRepository.php         # Shared Eloquent repository behavior
│   │   └── Contracts/
│   │       └── Repository.php         # Marker/base repository contract
│   └── Concerns/                      # Shared traits (HasBranch, HasPublicId, HasAuditTrail, etc.)
│
└── Casts/                             # Shared custom Eloquent casts (Money KES, EncryptedJson, etc.)
```

> **Cross-module communication rule:** A module may type-hint another module's **`Contracts/`** or call its
> public **`Services/`**. It may **never** import another module's `Repositories`, `Models`, or `Jobs`. This is
> the only sanctioned coupling and keeps the monolith decomposable.

### 3.3 `backend/app/Modules/{Module}/` — the canonical module anatomy

Every module has **the same internal skeleton**. This uniformity is deliberate: a developer who knows one module
knows them all, and every layer has exactly one place to live. The example below uses `Patients`; replace the
name for any module in §3.4.

```text
backend/app/Modules/Patients/         # One bounded context (replace name per §3.4)
├── Controllers/                       # HTTP entrypoints — THIN. Parse request, call Service, return Resource.
│   ├── PatientController.php          # No business logic, no DB queries, no validation here.
│   └── PatientMergeController.php     # One controller per cohesive endpoint group.
│
├── Services/                          # BUSINESS LOGIC + orchestration + DB transactions. The heart.
│   ├── PatientService.php             # Registration, lookup, dedup orchestration.
│   ├── PatientMergeService.php        # Record-merge rules. Calls repositories, fires events.
│   └── PatientNumberService.php       # Wraps SequenceService for PAT-YYYY-000001 generation.
│
├── Repositories/                      # PERSISTENCE ABSTRACTION over Eloquent (interface + impl).
│   ├── Contracts/
│   │   └── PatientRepository.php      # Interface depended on by services.
│   └── Eloquent/
│       └── EloquentPatientRepository.php  # Concrete impl, bound in module provider.
│
├── DTOs/                              # Typed data crossing boundaries (spatie/laravel-data).
│   ├── PatientData.php                # In/out of PatientService.
│   ├── RegisterPatientData.php        # Input DTO assembled from FormRequest.
│   └── PatientSummaryData.php         # Lightweight projection DTO.
│
├── Requests/                          # FormRequest validation — ALL write endpoints validate here.
│   ├── RegisterPatientRequest.php     # rules() + authorize(); mirrors frontend Zod schema.
│   └── UpdatePatientRequest.php
│
├── Resources/                        # JSON response shaping (API Resources / spatie-data transformers).
│   ├── PatientResource.php
│   └── PatientCollection.php
│
├── Models/                           # Eloquent models for THIS module only.
│   ├── Patient.php                    # Uses BranchScope, HasPublicId, soft deletes.
│   ├── PatientContact.php
│   └── NextOfKin.php
│
├── Events/                           # Domain events fired by services (side-effect triggers).
│   ├── PatientRegistered.php
│   └── PatientsMerged.php
│
├── Listeners/                        # React to this module's (or others') events.
│   ├── SendWelcomeSms.php             # Queued — calls Support/Notifications.
│   └── WritePatientAuditEntry.php
│
├── Jobs/                             # Queued background work owned by this module.
│   └── ReindexPatientSearch.php
│
├── Policies/                         # Authorization rules (Spatie permissions → can() gates).
│   └── PatientPolicy.php
│
├── Observers/                        # Eloquent lifecycle hooks (creating/updating/deleting).
│   └── PatientObserver.php            # e.g. stamp public_id, normalize phone on saving.
│
├── Enums/                            # Module-scoped enums (PatientStatus, Gender, MaritalStatus).
│   └── PatientStatus.php
│
├── Exceptions/                       # Module-specific domain exceptions.
│   └── DuplicatePatientException.php
│
└── Providers/
    ├── PatientServiceProvider.php     # Binds repository contract→impl, registers policies/observers.
    └── PatientEventServiceProvider.php # Maps this module's events → listeners.
```

> **Layer discipline (no mixed concerns):**
> - **Controllers** never touch Eloquent or contain `if` business rules.
> - **Services** never build JSON responses (that is Resources) and never write raw SQL outside repositories.
> - **Repositories** never contain business rules — only query/persistence.
> - **Models** carry relationships/casts/scopes, not orchestration.
> - **Requests** carry validation only; **Resources** carry presentation only.

### 3.4 Full module list expanded

Every bounded context from foundation §1 gets the **identical anatomy** of §3.3. Only the standout
files-of-interest are noted; assume all the layer folders exist in each.

```text
backend/app/Modules/
├── Auth/                              # Sanctum auth, login history, MFA/TOTP, password policy, device/IP.
│   └── Services/{AuthService,MfaService,LoginHistoryService}.php
├── Tenancy/                           # Branches CRUD, branch switching, BranchScope wiring, access grants.
│   └── Models/{Branch,UserBranchAccess}.php
├── Patients/                          # Patient registry, dedup/merge, next-of-kin (anatomy = §3.3).
├── Appointments/                      # Scheduling, slots, reminders, FullCalendar feed endpoints.
│   └── Services/{AppointmentService,SlotService,ReminderService}.php
├── Queue/                             # Queue pipeline, tickets ({DEPT}-NNN), Redis state, broadcasting.
│   ├── Services/{QueueService,TicketService,EmergencyBypassService}.php
│   └── Events/{TicketCalled,QueueAdvanced}.php   # Broadcast to queue boards
├── Triage/                            # Manchester Triage scoring → queue priority.
│   └── Enums/TriageLevel.php          # Red/Orange/Yellow/Green/Blue
├── EMR/                               # SOAP notes, vitals, diagnoses (ICD-10), encounters, history.
│   └── Services/{EncounterService,SoapNoteService,VitalsService}.php
├── ClinicalAlerts/                    # Drug interactions, allergy/critical-value alerts.
│   └── Listeners/{CheckDrugInteractions,RaiseCriticalValueAlert}.php
├── Pharmacy/                          # Prescriptions (RX-…), dispensing, stock decrement.
│   └── Services/{PrescriptionService,DispensingService}.php
├── Laboratory/                        # Test orders, samples (LAB-…), results, critical values.
│   └── Services/{LabOrderService,SampleService,ResultService}.php
├── Radiology/                         # Imaging orders (RAD-…), studies, report attachments.
├── Billing/                           # Invoices (INV-…), receipts (RCP-…), M-Pesa, cash.
│   ├── Services/{InvoiceService,PaymentService,ReceiptService}.php
│   └── Controllers/MpesaCallbackController.php   # Idempotent signed webhook
├── Insurance/                         # SHA claims (CLM-…), pre-auth, tracking via InsurerGateway.
│   └── Services/{ClaimService,PreAuthService}.php
├── Inpatient/                         # Admissions (ADM-…), wards/beds, rounds, discharge.
│   └── Services/{AdmissionService,BedManagementService,DischargeService}.php
├── Inventory/                         # Stock, drug catalog, POs (PO-…), GRNs, reorder levels.
│   └── Services/{StockService,PurchaseOrderService,GoodsReceivedService}.php
├── Reporting/                         # Cross-branch analytics, dashboards, scheduled report jobs.
│   └── Services/{ReportBuilderService,DashboardService}.php
├── Communication/                     # Outbound SMS/email orchestration via NotificationChannelManager.
│   └── Services/MessageDispatchService.php
├── PatientPortal/                     # Patient-facing endpoints (appointments, results, invoices).
├── Documents/                         # File ingest/serve via StorageManager, signed URLs, public_id.
│   └── Services/DocumentService.php   # Only place app reads/writes clinical files
├── Audit/                             # Immutable audit_logs writer + Spatie Activity Log glue.
│   └── Services/AuditLogService.php
└── Admin/                             # System settings, roles/permissions admin, branding, hospital profile.
    └── Services/{SettingService,RolePermissionService,BrandingService}.php
```

### 3.5 `backend/config/` — configuration files

One config file per concern. Code reads `config('...')`; it never hardcodes provider names, URLs, or limits.
Stock Laravel files (`app`, `auth`, `cache`, `database`, `filesystems`, `queue`, `session`, `sanctum`,
`broadcasting`, `mail`, `services`, `logging`, `cors`) are present; the **app-specific** files below are mandated
by the foundation.

```text
backend/config/
├── app.php                            # Stock: name, env, timezone (UTC), providers.
├── auth.php                           # Stock: guards (sanctum), password policies.
├── cache.php / session.php / queue.php / broadcasting.php   # Stock: Redis-backed per foundation.
├── database.php                       # Stock: MySQL 8 connection, redis connections.
├── filesystems.php                    # Stock + disks for local/s3/r2/b2 (consumed by storage.php).
├── sanctum.php / cors.php / logging.php / mail.php / services.php   # Stock framework config.
│
├── storage.php                        # ⮕ Storage driver abstraction: default driver, signed-URL TTL,
│                                      #    per-disk mapping, clinical-files visibility=private.
├── notifications.php                  # ⮕ Channel selection: sms=africastalking, email=mailgun|resend,
│                                      #    retry/backoff, per-event channel routing.
├── mpesa.php                          # ⮕ Daraja: STK/Paybill/Till shortcodes, passkey, callback URLs,
│                                      #    sandbox/prod toggle, idempotency key field.
├── sha.php                            # ⮕ Social Health Authority: endpoints, credentials, claim/pre-auth
│                                      #    config, polling intervals, insurer code.
├── alerts.php                         # ⮕ Clinical alerts: interaction severity thresholds, critical-value
│                                      #    ranges, allergy match rules, escalation channels.
├── branding.php                       # ⮕ Per-tenant branding: logos, colors, letterhead, PDF headers/footers.
├── hospital.php                       # ⮕ Hospital profile & policy: name, license, retention years (≥10),
│                                      #    triage SLAs, queue pipeline order, identifier formats.
├── permission.php                     # Spatie Laravel Permission config.
├── activitylog.php                    # Spatie Activity Log config.
└── data.php                           # spatie/laravel-data (DTO) config.
```

### 3.6 `backend/database/` — migrations, factories, seeders

Migrations are **grouped into subfolders by module/domain** so the schema's ownership is obvious and a module's
tables are reviewable together. Laravel's migrator is configured (via `RouteServiceProvider`/console) to load
these grouped paths.

```text
backend/database/
├── migrations/
│   ├── 0000_platform/                 # Cross-cutting tables not owned by one module
│   │   ├── ..._create_branches_table.php
│   │   ├── ..._create_sequences_table.php          # Foundation §6 (scope, value)
│   │   ├── ..._create_settings_table.php
│   │   ├── ..._create_audit_logs_table.php         # Immutable PHI/security log
│   │   ├── ..._create_permission_tables.php        # Spatie
│   │   └── ..._create_activity_log_table.php       # Spatie
│   ├── auth/                          # users, mfa_secrets, login_histories, password_histories, devices
│   ├── tenancy/                       # user_branch_access
│   ├── patients/                      # patients, patient_contacts, next_of_kin
│   ├── appointments/                  # appointments, appointment_slots
│   ├── queue/                         # queue_tickets, queue_stations
│   ├── triage/                        # triage_assessments
│   ├── emr/                           # encounters, soap_notes, vitals, diagnoses, allergies
│   ├── clinical_alerts/              # alert_rules, raised_alerts
│   ├── pharmacy/                      # prescriptions, prescription_items, dispense_records
│   ├── laboratory/                    # lab_orders, lab_samples, lab_results, reference_ranges
│   ├── radiology/                     # radiology_orders, radiology_studies
│   ├── billing/                       # invoices, invoice_items, payments, receipts, mpesa_transactions
│   ├── insurance/                     # sha_claims, pre_auths, claim_items
│   ├── inpatient/                     # admissions, wards, beds, ward_rounds, discharges
│   ├── inventory/                     # drug_catalog, stock_items, purchase_orders, goods_received_notes
│   ├── reporting/                     # report_definitions, scheduled_reports
│   ├── communication/                 # messages, message_logs
│   ├── documents/                     # documents (public_id, disk, path, signed-url metadata)
│   └── reference/                     # icd10_codes, drug_master (global reference data, no branch_id)
│
├── factories/                         # Model factories, namespaced per module (mirror Modules/*)
│   ├── Patients/PatientFactory.php
│   ├── Billing/InvoiceFactory.php
│   └── ...                            # one subfolder per module
│
└── seeders/
    ├── DatabaseSeeder.php             # Root orchestrator
    ├── Platform/                      # BranchSeeder, RolePermissionSeeder, SettingSeeder
    ├── Reference/                     # Icd10Seeder, DrugMasterSeeder (global catalogs)
    └── Demo/                          # DemoPatientsSeeder, DemoAppointmentsSeeder (non-prod only)
```

### 3.7 `backend/routes/` — per-module route files

Routes are split **one file per module** under `routes/api/`. `RouteServiceProvider` auto-loads all of them
with the `api` middleware group and a versioned prefix. No giant monolithic `api.php`.

```text
backend/routes/
├── api/                               # Versioned, per-module route files (prefix: /api/v1/{module})
│   ├── auth.php                       # login, logout, mfa, password, login-history
│   ├── tenancy.php                    # branches, branch-switch
│   ├── patients.php
│   ├── appointments.php
│   ├── queue.php
│   ├── triage.php
│   ├── emr.php
│   ├── clinical-alerts.php
│   ├── pharmacy.php
│   ├── laboratory.php
│   ├── radiology.php
│   ├── billing.php                    # includes signed M-Pesa callback (no-auth, signed) sub-group
│   ├── insurance.php
│   ├── inpatient.php
│   ├── inventory.php
│   ├── reporting.php
│   ├── communication.php
│   ├── patient-portal.php             # patient-guard routes
│   ├── documents.php                  # signed-URL serve endpoints
│   ├── audit.php
│   └── admin.php
├── api.php                            # Thin aggregator: requires each routes/api/*.php (or via provider)
├── channels.php                       # Broadcast channel auth (queue boards, alerts) per module
├── console.php                        # Closure-based artisan commands / scheduling glue
└── web.php                            # Minimal: health check, signed-URL redirect, CSRF cookie
```

### 3.8 `backend/tests/` — Unit / Feature / Integration

Tests mirror the module tree so any class's test location is predictable.

```text
backend/tests/
├── Unit/                              # Pure logic, no framework boot (Services, DTOs, value objects).
│   ├── Patients/PatientNumberServiceTest.php
│   ├── Billing/InvoiceTotalsTest.php
│   ├── Support/Sequences/SequenceServiceTest.php
│   └── ...                            # mirrors app/Modules/*
├── Feature/                           # HTTP-level: route → controller → service → DB (in-memory/transaction).
│   ├── Patients/RegisterPatientTest.php
│   ├── Queue/QueueAdvanceTest.php
│   ├── Auth/MfaLoginTest.php
│   └── ...                            # one folder per module endpoint group
├── Integration/                       # External-boundary + cross-module: M-Pesa callbacks, SHA gateway,
│   │                                  #   storage drivers, notification channels, broadcasting.
│   ├── Payments/MpesaCallbackIdempotencyTest.php
│   ├── Insurance/ShaGatewayTest.php
│   ├── Storage/StorageDriverContractTest.php
│   └── Notifications/SmsChannelTest.php
├── Pest.php                           # Pest bootstrap, shared expectations.
├── TestCase.php                       # Base test case (app boot, branch context helpers).
├── CreatesApplication.php             # App factory trait.
└── Fixtures/                          # Static payloads (sample M-Pesa callbacks, SHA responses, files).
```

### 3.9 `backend/storage/`, `bootstrap/`, `public/`

```text
backend/bootstrap/
├── app.php                            # Laravel 11 application bootstrap (middleware, routing, exceptions).
├── providers.php                      # Auto-registered providers list.
└── cache/                             # Compiled config/routes/services cache (gitignored).

backend/public/
├── index.php                          # Front controller (web server document root).
├── robots.txt                         # Disallow crawling of API host.
├── .htaccess                          # Apache rewrite (WAMP/dev parity) — nginx uses docker/nginx conf.
└── build/                             # (if any server assets compiled) — SPA is served from frontend.

backend/storage/
├── app/
│   ├── public/                        # Symlinked public disk (non-clinical, e.g. branding logos).
│   └── private/                       # Local clinical-document disk (MVP default; signed URLs only).
├── framework/                         # cache/, sessions/, views/, testing/ (framework runtime).
└── logs/                              # laravel.log (gitignored; shipped to centralized logging in prod).
```

---

## 4. `frontend/` — React feature-based SPA/PWA

React 18 + TypeScript (strict) + Vite. **Feature-based** organization: a feature owns its components, hooks,
API layer, schemas, types, and i18n. Only domain-agnostic shared code lives in `components/ui`, `lib`, `hooks`.

### 4.1 `frontend/` top level

```text
frontend/                              # React 18 + TS + Vite SPA/PWA (separate deployable)
├── public/                            # Static assets served as-is + PWA manifest/icons (see §4.6)
├── src/                               # Application source (see §4.2–§4.5)
├── tests/                             # E2E (Playwright) + shared test setup (see §4.6)
│
├── index.html                         # Vite HTML entry (mounts #root, links manifest)
├── package.json                       # Deps + scripts (dev, build, test, lint, type-check)
├── package-lock.json                  # Locked deps
├── tsconfig.json                      # TS strict mode, path aliases (@app, @features, @components, @lib)
├── tsconfig.node.json                 # Config for Vite/build tooling
├── vite.config.ts                     # Vite + React + PWA plugin + path aliases + code splitting
├── vitest.config.ts                   # Vitest unit/component config (jsdom, coverage ≥80%)
├── playwright.config.ts               # E2E config (browsers, base URL, traces)
├── tailwind.config.ts                 # Tailwind: class dark-mode strategy, theme tokens, content globs
├── postcss.config.cjs                 # PostCSS (tailwind, autoprefixer)
├── .eslintrc.cjs                      # ESLint: TS strict, no-any, import order, a11y, react-hooks
├── .prettierrc                        # Prettier formatting
├── .env.example                       # Frontend env: VITE_API_URL, VITE_WS_URL, VITE_SENTRY_DSN, feature flags
└── .gitignore                         # node_modules/, dist/, coverage/, .env
```

### 4.2 `frontend/src/app/` — composition root

`src/app` is the **application shell**: routing, root providers, layout, and global error/loading boundaries.
It composes features; it contains no feature business logic.

```text
frontend/src/app/
├── App.tsx                            # Root component: providers + router outlet.
├── router/
│   ├── index.tsx                      # React Router v6 route tree (route-level code splitting / lazy).
│   ├── routes.ts                      # Centralized route path constants (typed).
│   ├── ProtectedRoute.tsx             # <ProtectedRoute permission="..."> guard (RBAC).
│   └── BranchGuard.tsx                # Ensures an active branch is selected before app routes.
├── layout/
│   ├── AppShell.tsx                   # Sidebar + topbar + content frame.
│   ├── Sidebar.tsx                    # Nav built from permissions.
│   ├── Topbar.tsx                     # Branch switcher, theme toggle, user menu, notifications.
│   └── Breadcrumbs.tsx
├── providers/                         # App-wide provider composition (re-exports from src/providers).
│   └── AppProviders.tsx               # QueryClient, Theme, Auth, Branch, i18n, Toast, ErrorBoundary.
└── error/
    ├── RootErrorBoundary.tsx          # Top-level error UI.
    └── NotFound.tsx                   # 404 route.
```

### 4.3 `frontend/src/features/{feature}/` — canonical feature anatomy

Every feature shares the same internal shape. Example uses `patients`; replace per §4.4.

```text
frontend/src/features/patients/        # One feature (replace name per §4.4)
├── api/                               # Server communication for THIS feature only.
│   ├── patientApi.ts                  # fetch wrappers hitting /api/v1/patients (typed).
│   └── queries.ts                     # TanStack Query hooks (usePatients, usePatient, useRegisterPatient).
├── components/                        # Presentational + container components scoped to the feature.
│   ├── PatientList.tsx
│   ├── PatientForm.tsx                # Uses RHF + Zod resolver (schemas below).
│   ├── PatientCard.tsx
│   └── PatientSearchBar.tsx
├── pages/                             # Route-mounted screens (lazy-loaded by router).
│   ├── PatientsListPage.tsx
│   ├── PatientDetailPage.tsx
│   └── RegisterPatientPage.tsx
├── hooks/                             # Feature-specific hooks (non-query UI logic).
│   └── usePatientFilters.ts
├── schemas/                           # Zod schemas mirroring backend FormRequests.
│   └── patientSchemas.ts              # registerPatientSchema, updatePatientSchema.
├── types/                             # Feature TS types/interfaces (mirror backend Resources/DTOs).
│   └── patient.ts
├── store/                             # Zustand slice for feature-local UI state (filters, selection).
│   └── patientUiStore.ts
├── i18n/                              # Per-feature translation namespaces (en, sw).
│   ├── en.json
│   └── sw.json
├── __tests__/                         # Co-located component/unit tests (Vitest + RTL).
│   ├── PatientForm.test.tsx
│   └── patientSchemas.test.ts
└── index.ts                           # Public surface of the feature (what app/router may import).
```

> **Separation rule (frontend):** A feature must not import another feature's internals. Shared cross-feature
> code is promoted to `src/lib`, `src/hooks`, `src/components/ui`, or `src/providers`. No business logic in
> `components/ui`; no API calls outside a feature's `api/` or `src/lib/apiClient`.

### 4.4 Full feature list expanded

One feature per user-facing domain area (aligned to backend modules + UX concerns). Each has the §4.3 anatomy.

```text
frontend/src/features/
├── auth/                              # Login, MFA/OTP, password reset, session, login history.
├── dashboard/                         # Role-aware landing dashboards + KPIs (Recharts).
├── branches/                          # Branch management + branch switcher logic (Tenancy).
├── patients/                          # Registry, search, registration, profile, merge.
├── appointments/                      # Scheduling (FullCalendar), reminders, slots.
├── queue/                             # Real-time queue boards (WebSockets), station views, bypass.
├── triage/                            # Manchester triage form + level indicators.
├── emr/                               # Encounters, SOAP notes, vitals, diagnoses, history timeline.
├── clinical-alerts/                  # Alert banners, interaction/allergy/critical-value modals.
├── pharmacy/                          # Prescriptions, dispensing, stock view.
├── laboratory/                        # Lab orders, sample tracking, results entry/view.
├── radiology/                         # Imaging orders, study/report viewer.
├── billing/                           # Invoices, payments (M-Pesa STK + cash), receipts, PDFs.
├── insurance/                         # SHA claims, pre-auth, tracking.
├── inpatient/                         # Admissions, ward/bed board, rounds, discharge.
├── inventory/                         # Stock, drug catalog, purchase orders, GRNs.
├── reporting/                         # Cross-branch analytics, dashboards, exports.
├── communication/                    # Message composer, templates, delivery logs.
├── patient-portal/                   # Patient-facing: my appointments, results, invoices.
├── documents/                        # Upload/preview clinical docs via signed URLs.
├── audit/                            # Audit-log viewer (admin/security).
└── admin/                            # Settings, roles/permissions, branding, hospital profile.
```

### 4.5 `frontend/src/components/`, `lib/`, `hooks/`, `providers/`, `i18n/`

These are the **domain-agnostic, cross-feature** shared layers. Nothing here knows about "patients" or "billing".

```text
frontend/src/
├── components/
│   ├── ui/                            # Design-system primitives ONLY (no domain logic).
│   │   ├── Button.tsx
│   │   ├── Input.tsx  Select.tsx  Checkbox.tsx  Radio.tsx
│   │   ├── Modal.tsx  Drawer.tsx  Tooltip.tsx  Popover.tsx
│   │   ├── Table.tsx  Pagination.tsx  Tabs.tsx  Badge.tsx
│   │   ├── Card.tsx   Skeleton.tsx   Spinner.tsx  Toast.tsx
│   │   ├── FormField.tsx              # RHF-aware field wrapper (label, error, hint).
│   │   └── index.ts                   # Barrel export.
│   └── icons/
│       ├── Icon.tsx                   # Single <Icon name="..."/> registry component (NO emojis).
│       ├── registry.ts                # name → SVG component map.
│       └── svg/                       # Raw SVG sources imported by the registry.
│
├── lib/                               # Framework-agnostic utilities & infrastructure clients.
│   ├── apiClient.ts                   # Axios/fetch instance: base URL, auth header, branch header, 401 refresh.
│   ├── queryClient.ts                 # TanStack Query client config (stale times, retry).
│   ├── websocket.ts                   # Echo/WebSocket client for broadcasting (queue, alerts).
│   ├── auth.ts                        # Token storage, permission checks (hasPermission).
│   ├── format/                        # money (KES), date (Africa/Nairobi), identifiers formatters.
│   │   ├── money.ts  date.ts  ids.ts
│   ├── validation/                    # Shared Zod helpers (phone KE, national-id, etc.).
│   └── constants.ts                   # App-wide constants (mirrors backend identifier formats, triage levels).
│
├── hooks/                             # Cross-feature reusable hooks (no domain coupling).
│   ├── useDebounce.ts
│   ├── usePermission.ts               # Reads auth store → boolean for RBAC UI gating.
│   ├── useActiveBranch.ts
│   ├── useMediaQuery.ts
│   └── useOnlineStatus.ts             # PWA online/offline awareness.
│
├── providers/                         # React context providers (global state wiring).
│   ├── ThemeProvider.tsx              # light/dark via Tailwind class + Zustand + localStorage.
│   ├── AuthProvider.tsx               # Session/user/permissions context.
│   ├── BranchProvider.tsx             # Active branch context + switcher state.
│   ├── QueryProvider.tsx              # TanStack QueryClientProvider.
│   ├── I18nProvider.tsx               # react-i18next init + namespace loading.
│   └── ToastProvider.tsx
│
├── stores/                            # Global Zustand stores (truly app-wide UI state).
│   ├── themeStore.ts
│   ├── branchStore.ts                 # active_branch_id.
│   └── authStore.ts
│
├── i18n/                              # i18n bootstrap + shared namespaces (features add their own).
│   ├── config.ts                      # react-i18next setup, en + sw, namespace registry.
│   ├── en/
│   │   ├── common.json                # Shared strings (buttons, validation, nav).
│   │   └── errors.json
│   └── sw/
│       ├── common.json                # Kiswahili.
│       └── errors.json
│
├── types/                             # Global shared TS types (ApiResponse<T>, Paginated<T>, Permission).
│   └── api.ts
│
├── styles/                            # Global Tailwind entry + base layer (no inline CSS anywhere else).
│   └── globals.css                    # @tailwind base/components/utilities + CSS custom props (theme).
│
├── main.tsx                           # Vite entry: mounts <App/> into #root, registers service worker.
└── vite-env.d.ts                      # Vite/TS ambient types.
```

### 4.6 `frontend/tests/` and `frontend/public/` (PWA)

```text
frontend/tests/                        # Cross-feature test scaffolding (unit/component tests co-locate in features).
├── e2e/                               # Playwright end-to-end specs (critical journeys).
│   ├── auth.spec.ts
│   ├── patient-registration.spec.ts
│   ├── queue-flow.spec.ts             # Reception→Triage→Doctor→Lab→Pharmacy→Billing
│   └── billing-mpesa.spec.ts
├── setup/
│   ├── vitest.setup.ts                # RTL matchers, MSW server, i18n test init.
│   └── msw/                           # Mock Service Worker handlers for API stubbing.
│       └── handlers.ts
└── utils/
    └── renderWithProviders.tsx        # Test render wrapper (providers + router + query client).

frontend/public/                       # Served verbatim by Vite/host.
├── manifest.webmanifest               # PWA manifest: name, theme color, display=standalone, icons.
├── robots.txt
├── favicon.ico
├── offline.html                       # Offline fallback shell (PWA).
└── icons/                             # PWA/installable icons (192, 512, maskable) + apple-touch.
    ├── icon-192.png
    ├── icon-512.png
    └── maskable-512.png
# Note: service worker is generated by vite-plugin-pwa at build (workbox); registered in src/main.tsx.
```

---

## 5. `docker/` — container build context

All container build files and service configuration live here; `docker-compose.yml` at the root references them.
This keeps infra out of application code.

```text
docker/
├── backend/
│   ├── Dockerfile                     # Multi-stage PHP 8.3-fpm: composer install → runtime image.
│   ├── php.ini                        # Prod PHP settings (opcache, memory, upload limits).
│   └── entrypoint.sh                  # Migrate (gated), cache config/routes, start php-fpm.
├── frontend/
│   ├── Dockerfile                     # Multi-stage node build → static dist served by nginx.
│   └── nginx.conf                     # SPA fallback, gzip, cache headers, security headers.
├── nginx/
│   ├── Dockerfile                     # Reverse proxy image (API + SPA).
│   ├── default.conf                   # Routes /api → php-fpm, / → SPA, /ws → websocket upstream.
│   └── ssl/                           # TLS certs/keys for local HTTPS parity (gitignored in prod).
├── mysql/
│   ├── my.cnf                         # MySQL 8 tuning (innodb, charset utf8mb4).
│   └── init/                          # First-boot SQL (create DB, app user, grants).
├── redis/
│   └── redis.conf                     # Persistence + maxmemory policy (cache/queue/broadcast).
├── queue/
│   └── supervisord.conf               # Horizon/queue:work supervisor for backend workers.
├── scheduler/
│   └── crontab                        # Runs `artisan schedule:run` every minute.
└── websocket/
    └── (laravel-reverb/echo config)   # Broadcasting server config for queue boards & alerts.
```

---

## 6. `.github/`, `.husky/`, `Makefile`, root config

Repo-wide automation and developer ergonomics. (Tree shown in §2; purposes summarized here.)

| Path | Purpose |
|---|---|
| `.github/workflows/*` | CI gates: lint (Pint/ESLint), static analysis (PHPStan/tsc), tests (Pest/Vitest/Playwright), coverage ≥80%, image build/push, security scans, staged/prod deploys. |
| `.github/CODEOWNERS` | Per-path review ownership: `backend/*`, `frontend/*`, `docs/*`, `docker/*`. |
| `.github/dependabot.yml` | Automated dependency PRs (composer, npm, docker, actions). |
| `.husky/pre-commit` | `lint-staged`: Pint on staged PHP, ESLint+Prettier on staged TS. |
| `.husky/commit-msg` | `commitlint` enforcing Conventional Commits (`feat:`, `fix:`, `chore:` …). |
| `.husky/pre-push` | Type-check + affected unit tests before push (fast feedback). |
| `Makefile` | Developer verbs: `make up/down`, `make migrate`, `make fresh`, `make seed`, `make test`, `make lint`, `make backend-shell`, `make frontend-dev`. |
| `commitlint.config.cjs` | Conventional Commits ruleset consumed by the `commit-msg` hook. |
| `.editorconfig` / `.gitattributes` / `.gitignore` | Cross-editor style, LF normalization, ignore rules shared by both apps. |
| `.env.example` (root) | Compose-only variables (host ports, image tags, project name). App envs live in `backend/.env.example` and `frontend/.env.example`. |

---

## 7. `docs/` — architecture & specification set

Living documentation. `00-foundation.md` is authoritative; numbered docs expand specific concerns. This file
(`16-folder-structure.md`) defines the physical layout above.

```text
docs/
├── 00-foundation.md                   # ⭐ Single source of truth for cross-cutting decisions (authoritative).
├── 01-executive-summary.md
├── 02-prd.md                          # Product requirements.
├── 03-srs.md                          # Software requirements specification.
├── 04-functional-requirements.md
├── 05-non-functional-requirements.md
├── 06-user-stories.md
├── 07-use-cases.md
├── 08-rbac-matrix.md                  # Full permission matrix referenced by Policies/ProtectedRoute.
├── 09-system-architecture.md          # C4 views, request lifecycle, real-time, scaling.
├── 10-…-15-…                          # (data model, API spec, integrations, security, etc.)
├── 16-folder-structure.md             # ⬅ THIS DOCUMENT — canonical repository layout.
├── 17-…-27-…                          # (deployment, testing strategy, runbooks, etc.)
├── diagrams/                          # Source diagrams (mermaid/drawio) referenced by the docs.
└── adr/                               # Architecture Decision Records (one file per significant decision).
    └── 0001-modular-monolith.md
```

---

## 8. Naming & placement rules (enforced)

| Concern | Rule |
|---|---|
| **Backend namespaces** | `App\Modules\{Module}\{Layer}\{Class}` (PSR-4 in `composer.json`). One class per file. |
| **Module layer folders** | Exactly: `Controllers`, `Services`, `Repositories` (`Contracts`/`Eloquent`), `DTOs`, `Requests`, `Resources`, `Models`, `Events`, `Listeners`, `Jobs`, `Policies`, `Observers` (+ optional `Enums`, `Exceptions`, `Providers`). No other top-level layer folders. |
| **No flat controllers** | `app/Http/Controllers` holds only the abstract base `Controller.php`. All feature controllers live in their module. |
| **Cross-module imports** | Only `{Module}\Contracts` or public `{Module}\Services`. Lint rule forbids importing another module's `Models`/`Repositories`/`Jobs`. |
| **Config access** | Always `config('hospital.x')` etc. No `env()` outside config files. |
| **Migrations** | Grouped under `database/migrations/{domain}/`; filename keeps Laravel timestamp prefix. |
| **Routes** | One file per module in `routes/api/`; path prefix `/api/v1/{module}`. |
| **Tests** | Mirror module path under `tests/{Unit|Feature|Integration}/{Module}/`. |
| **Frontend features** | `src/features/{feature}` with `api`, `components`, `pages`, `hooks`, `schemas`, `types`, `store`, `i18n`, `__tests__`, `index.ts`. |
| **Frontend shared code** | Domain-agnostic only → `components/ui`, `components/icons`, `lib`, `hooks`, `providers`, `stores`, `i18n`. |
| **No emojis / inline CSS / inline JS logic** | Icons via `<Icon name>`; styling via Tailwind classes; logic via extracted hooks (foundation §10). |
| **i18n** | No hardcoded user-facing strings; namespaces `common`/`errors` shared, feature namespaces local; `en` + `sw`. |

---

## 9. Separation-of-concerns matrix (what goes where)

The single answer to "where does this code belong?"

| If the code… | Backend home | Frontend home |
|---|---|---|
| Handles an HTTP request, returns a response | `Modules/{M}/Controllers` (thin) | `features/{f}/pages` + `features/{f}/api` |
| Contains business rules / orchestration / transactions | `Modules/{M}/Services` | `features/{f}/hooks` (UI logic) / service-state via TanStack Query |
| Reads/writes the database | `Modules/{M}/Repositories/Eloquent` | n/a (talks to API only) |
| Carries typed data across a boundary | `Modules/{M}/DTOs` (spatie-data) | `features/{f}/types` + `schemas` (Zod) |
| Validates input | `Modules/{M}/Requests` (FormRequest) | `features/{f}/schemas` (Zod) via RHF |
| Shapes the JSON / view output | `Modules/{M}/Resources` | `features/{f}/components` |
| Defines persistent entities | `Modules/{M}/Models` | n/a |
| Fires/handles side-effects | `Events` / `Listeners` / `Jobs` | TanStack Query invalidation / WebSocket handlers in `lib` |
| Authorizes an action | `Modules/{M}/Policies` (Spatie) | `ProtectedRoute` + `usePermission` |
| Talks to an external vendor (SMS/email/storage/M-Pesa/SHA) | `app/Support/{Notifications|Storage|Payments|Insurance}` behind a `Contract` | `lib/apiClient` (never calls vendors directly) |
| Is a reusable, domain-agnostic widget | `app/Support/Concerns` (traits) | `components/ui` / `components/icons` |
| Is cross-cutting config | `config/{concern}.php` | `.env` (`VITE_*`) + `lib/constants.ts` |
| Is infrastructure / deployment | `docker/`, root compose, `.github/` | same (shared) |

> **The litmus test:** if a file has more than one of the responsibilities in the left column, it is doing too
> much — split it along these boundaries before merging.

---

*End of `16-folder-structure.md`. Subordinate to `00-foundation.md`.*

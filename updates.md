# Updates — Afya HMS build log

> Living status note for `D:\wamp\www\hospital`. Tracks where we've reached,
> what we were just doing, and what's next. The canonical reference for the
> product is `docs/00-foundation.md` and the consolidated summary in
> `C:\Users\BLADE\.qwen\projects\c--windows-system32\memory\project\afya-hms-canonical-spec.md`.

---

## How to read this file

Sections are reverse-chronological. **Latest at top.** Each entry has:

- **What** — the slice / topic
- **Status** — ✅ shipped · 🟡 in progress · ⏳ next
- **Why** — the spec anchor (which docs this satisfies)
- **Files** — paths changed

---

## 2026-06-26 (later) — Cleared the three auth follow-ups

**Status:** ✅ All three fixed and verified against the running API.

1. **Duplicate roles/permissions in the API surface** (`roles:["receptionist","receptionist"]`,
   perms listed twice). Root cause: every user holds each role under *both* the `web` and
   `sanctum` guards (the `permissions:mirror-to-sanctum` command assigns a sanctum copy on
   purpose so Spatie resolves perms on token requests), and `UserResource` serialized
   `$user->roles` without collapsing the shared names.
   - **Fix:** `UserResource` now `->unique()->values()` on both `roles` and `permissions`.
     Kept the cross-guard assignment (it's load-bearing for permission resolution) — deduped
     the *output* instead. `AuthService::tokenAbilities()` already `array_unique`d, left as-is.
   - **Verified:** login → `roles:["receptionist"]`, `permissions` 33 unique (was 66).
   - **Files:** `app/Modules/Auth/Resources/UserResource.php`.

2. **CSRF mismatch (and any `abort()`) reported as 500 instead of its real status.** The
   framework converts `TokenMismatchException` → `HttpException(419)` *before* our JSON
   render closure runs, but the closure's `match` had explicit cases only for a few Symfony
   exceptions and fell through to `default => 500` for the generic `HttpException`.
   - **Fix:** `bootstrap/app.php` render closure — added an explicit
     `TokenMismatchException => 419` case and a catch-all
     `HttpExceptionInterface => $e->getStatusCode()` (folded the old 404/405/429 cases into
     it, since they all just returned their own status). Now every `abort()`/HttpException
     surfaces its true code.
   - **Verified:** unknown route → 404, GET on POST-only login → 405 (both via the new
     generic case). 419 path follows the same mechanism.
   - **Files:** `bootstrap/app.php`.

3. **`:8000` / `:8080` port ambiguity.** Reverb had already moved to `:6001`, so the only
   thing still out of step was `APP_URL=:8000` while the API is actually served on `:8080`
   (and the frontend calls `:8080`). Separately, the **frontend** `.env` still pointed
   `VITE_REVERB_PORT` at `:8080`, which would collide with the API.
   - **Fix:** `backend/.env` `APP_URL=http://localhost:8080`; `frontend/.env`
     `VITE_REVERB_PORT=6001`. Net: API `:8080`, Reverb `:6001`, MySQL `:3306`, Vite `:5173`.
   - **Files:** `backend/.env`, `frontend/.env`.

> Note: requires `php artisan config:clear` + a server restart to pick up the `.env` change
> (the running `serve` process caches config). Done this session.

---

## 2026-06-26 — Login broken end-to-end: API not running, then Sanctum CSRF 500

**Status:** ✅ Login verified working end-to-end (HTTP 200 + token) for a browser-style
request (`Origin: http://localhost:5173`). Two distinct, sequential bugs were fixed.

> Symptom reported: logging into any portal failed even though credentials were correct
> and WAMP/MySQL were running.

### Bug 1 — `ERR_CONNECTION_REFUSED` on `:8080`

- **Cause:** WAMP only runs Apache + MySQL. The **Laravel API** (`php artisan serve`)
  is a *separate* process that nothing had started, so nothing listened on `:8080`.
  The browser request died before reaching PHP — DB "working" was irrelevant.
- **Diagnosis:** `netstat` showed `5173` (Vite) and `3306` (MySQL) up, but `8080` absent
  and no `php` process running.
- **Fix:** start the API on the port the frontend's `.env` expects
  (`VITE_API_BASE_URL=http://localhost:8080/api/v1`):
  ```
  cd D:\wamp\www\hospital\backend
  "d:\wamp\bin\php\php8.3.28\php.exe" artisan serve --host=127.0.0.1 --port=8080
  ```
  Must stay running alongside `npm run dev`. curl login → 200 + token.

### Bug 2 — `500 Internal Server Error` → "CSRF token mismatch."

- **Cause:** the SPA uses **stateless Bearer-token** auth (`http.ts`:
  `withCredentials:false`, `Authorization: Bearer <token>`), but `backend/.env` listed the
  Vite origin in `SANCTUM_STATEFUL_DOMAINS`. Sanctum's `EnsureFrontendRequestsAreStateful`
  then treated `/auth/login` as a *cookie-session* SPA call and demanded a CSRF token.
  The browser sends an `Origin` header → stateful path → CSRF check → 500. curl had no
  `Origin`, so it silently took the stateless path — hence curl worked but the browser
  didn't (the exact discrepancy that masked the bug).
- **Fix:** `backend/.env` → `SANCTUM_STATEFUL_DOMAINS=` (empty) so all requests are
  stateless token auth, matching the frontend. Then `php artisan config:clear` + restart
  `artisan serve` (the running process had cached the old value).
- **Verified:** browser-style login (`Origin: http://localhost:5173`) → **200 + token**.

**Notable**
- A CSRF mismatch returning **500** instead of **419** means the exception handler isn't
  mapping `TokenMismatchException` → 419. Cosmetic now (cause removed), but a real bug if
  cookie auth is ever adopted.
- Confirmed live: the duplicate-roles bug is still present
  (`roles:["receptionist","receptionist"]`, perms doubled) — the known
  `MirrorPermissionsToSanctum` double-assign from Open follow-ups, harmless to login.
- `APP_URL=:8000` vs the API actually served on `:8080` (and Reverb wanting `:8080`)
  remains unreconciled — fine for now since `serve --port` overrides `APP_URL`.

**Files:** `backend/.env` (emptied `SANCTUM_STATEFUL_DOMAINS`).

**Next:** reconcile the port story (pick one of `:8000`/`:8080` for the API and move
Reverb off it); map `TokenMismatchException` → 419; dedupe roles in
`MirrorPermissionsToSanctum::handle()`.

---

## 2026-06-24 (late) — UI overhaul: nav config + role-based redirect + role-scoped portal

**Status:** Frontend ✅ type-check ✓ · lint ✓ · build (PWA, 12 precache entries) ✓ · test (3/3) ✓.

> Resumed after the previous session (`edaab930`) died mid-task on an API error
> (`403 ... restricted to official Claude Code client`). The design-system token
> work (`tailwind.config.ts`, `index.css`, `components/icons/Icon.tsx`) had already
> reached disk; the nav config + resolver it was *about to* write had not.

**What landed**

- **`frontend/src/config/navigation.ts`** (new) — single source of truth:
  - `NAV_ITEMS` — modules ordered along the patient journey (intake → clinical →
    diagnostics → dispensing → money → back-office), each with `icon` (central
    `IconName`) + RBAC `permission`. Not-yet-built modules point at their station
    board (`/queue/board/{LAB,RAD,PHA,BIL}`) so no link is dead.
  - `resolveHomeRoute(roles)` — role → landing route with a priority order so a
    user holding multiple roles lands on the clinical board they use daily.
    Maps all 10 slugs (hospital-admin, doctor, nurse, receptionist,
    records-officer, pharmacist, lab-technician, radiologist, cashier, patient).
- **`AppShell.tsx`** — dropped its hardcoded 4-item nav; now renders `NAV_ITEMS`
  (RBAC-filtered) with `<Icon>` glyphs, wider 56-rail, refined active/hover states.
- **`LoginPage.tsx`** — post-login redirect now honors a deep-link `from`, else
  `resolveHomeRoute(response.user.roles)` (was hardcoded `/`).
- **`DashboardPage.tsx`** — rebuilt as a role-scoped portal: one tile per module
  the user can reach (driven by the same gated `NAV_ITEMS`), icon chips, hover lift.
- **i18n** — added `nav:checkIn` to `en`/`sw`.

**Notable decisions**
- The dashboard portal and the sidebar consume the *same* `NAV_ITEMS` + `hasPermission`
  filter — one config drives nav, landing, and the portal grid. Add a module once.
- Dead-link avoidance: modules without their own page yet (Lab/Rad/Pharmacy/Billing)
  route to the existing queue station boards rather than 404 placeholders.

**Next:** real per-module dashboards/widgets (counts, today's queue, pending tasks)
as each backend slice lands; then the Pharmacy dispense slice (next roadmap module).

---

## 2026-06-24 — Test-harness fixes + Slice 4: EMR / SOAP (backend + frontend)

**Status:** Frontend ✅ type-check ✓ · lint ✓ · build ✓ · test (3/3) ✓.
Backend ✅ EMR feature tests (5/5, 27 assertions) · RbacMatrixTest now green.

### Part A — fixed the backend test harness (was 13/17 failing)

Audit found the suite was red for two config reasons, plus pre-existing RBAC drift:

- **`phpunit.xml` `APP_KEY` was malformed** — decoded to 35 bytes (AES needs 32),
  so all 13 feature tests died with "Unsupported cipher or incorrect key length".
  Replaced with a valid `base64:` key and added explicit `DB_HOST/PORT/USERNAME/PASSWORD`
  for local runs (Docker overrides via real env at CI time).
- **`.env.testing` `DB_HOST=mysql`** (Docker hostname) hangs standalone WAMP — noted; phpunit.xml now pins `127.0.0.1`.
- **`RbacMatrixTest` (4 failures, pre-existing)** — reconciled `Rbac::ROLE_PERMISSIONS`
  1:1 with `docs/08-rbac-matrix.md` §6:
  - The matrix is **not** a superuser-HA model — replaced wildcards (`patients.*`,
    `documents.*`, `lab.*`, `communication.*`) that over-granted `*-own`/clinical-create
    perms with explicit lists.
  - Code under-granted `documents.*` (nurse/receptionist/pharmacist/lab/radiology/cashier)
    and `inventory.*`/`purchase-orders.*` (pharmacist/nurse/lab/radiology/cashier) — added per matrix.
  - Added the missing **Visits** + **Webhooks** matrix tables to `docs/08-rbac-matrix.md`
    (code had `visits.*`/`webhooks.replay`; the doc didn't).
  - `emr.delete` is intentionally granted to no role (≥10-yr retention) → added
    `Rbac::NEVER_GRANTED` allow-list honored by the orphan test.
  - Fixed a test bug (`role slugs` compared slugs vs labels → now `array_keys`).

### Part B — Slice 4: EMR / SOAP

**Backend** — `app/Modules/Emr/` (built from the stub):
- **Migration** `2026_06_23_040000_create_emr_tables`: `encounters`, `soap_notes`,
  `diagnoses_catalog` (global, no branch_id), `diagnoses`; applies the deferred
  `visits.encounter_id` + `queue_tickets.encounter_id` FKs.
- **Models** `Encounter`, `SoapNote`, `Diagnosis`, `DiagnosisCatalog` (BranchScope + SoftDeletes; catalog is reference data).
- **Repositories** `EncounterRepository` (aggregate: encounter+SOAP+diagnoses) + `DiagnosisCatalogRepository`.
- **`EmrService`** — `openEncounter` (idempotent, links visit), `saveSoap`, `signSoap`,
  `amendSoap`, `addDiagnosis` (ICD-10 snapshot), `removeDiagnosis`, `completeEncounter`.
  Clinical-safety invariants enforced: signed notes immutable; edits become signed addenda; soft-delete only.
- **Controller/Requests/Resources/routes/Provider** — thin controller, FormRequest
  authorize() per `emr.*`/`diagnoses.*`; `EmrServiceProvider` auto-discovered.
- **`DiagnosisCatalogSeeder`** — 20-entry ICD-10 starter set (idempotent).
- **Tests** `tests/Feature/Emr/EmrFlowTest.php` — open/idempotency, SOAP sign→immutable→amend,
  ICD-10 snapshot, complete, FormRequest permission gating. All green.

**Frontend** — `frontend/src/features/emr/`:
- `types.ts`, `api.ts` (TanStack hooks: encounter by-visit, open, saveSoap, sign, amend,
  add/remove diagnosis, complete, ICD-10 type-ahead).
- `EncounterPage.tsx` — opens/loads encounter for a visit, SOAP editor with sign/amend
  (read-only once signed), ICD-10 diagnosis search/add/remove, disposition completion.
  Permission-gated via `useAuth().hasPermission`.
- Route `/emr/encounter/:visitId`; **Consult** button added to the DOC station board.
- i18n `emr:*` namespace + `queue:board.consult` + `common:remove` in `en` and `sw`.

**Endpoints:** `POST /encounters`, `GET /encounters/{id}`, `GET /encounters/visit/{visitId}`,
`POST /encounters/{id}/complete`, `GET /patients/{id}/encounters`, `PUT /encounters/{id}/soap`,
`POST /encounters/{id}/soap/{sign,amend}`, `POST /encounters/{id}/diagnoses`,
`DELETE /diagnoses/{id}`, `GET /diagnoses-catalog?q=`.

**Notable decisions**
- Encounter is the aggregate root; one repository persists encounter+SOAP+diagnoses (DDD aggregate).
- EMR depends on Queue's `Visit`/`QueueRepository` (same direction as Triage→Queue).
- `diagnoses_catalog` is global reference data — no `BranchScope`.
- Diagnoses snapshot `icd10_code`+`description` at capture time (stable clinical record).

**Next:** wire `queue_tickets.encounter_id` on the active DOC ticket when opening an
encounter (currently only `visits.encounter_id` is linked); Pharmacy dispense slice;
then Lab → Billing/M-Pesa. WebSocket (Reverb) realtime still outstanding from Slice 3.

---

## 2026-06-23 — Slice 3: Queue + Triage frontend pages

**Status:** ✅ type-check ✓ · lint ✓ · build (191 modules) ✓ · test (3/3) ✓.
Backend smoke `curl` already proved end-to-end earlier this session.

**What landed**

- `frontend/src/features/queue/`
  - `types.ts` — `StationCode`, `TicketState`, `TicketPriority`, `MtsCategory`, `QueueStation`, `QueueTicket`, `Visit`, `BoardSnapshot`, `PublicBoard`, `TriageVitals`, `TriageAssessment`.
  - `api.ts` — `useStations`, `useBoard` (4 s polling), `usePublicBoard` (5 s polling), `useOpenVisit`, `useStartTicket`, `useCompleteTicket`, `useHoldTicket`, `useNoShowTicket`, `useCallNext`. All mutations expose both `mutate` and `mutateAsync`.
  - `QueueIndexPage.tsx` — card grid of the 7 stations with status badges + descriptions.
  - `CheckInPage.tsx` — patient search (via `usePatients`), select, visit-type dropdown, opens visit + issues REC ticket.
  - `BoardPage.tsx` — station board with `REC/TRI/DOC/LAB/RAD/PHA/BIL` tab switcher, "Now serving" + "Waiting" sections, MTS-color-coded rows, action buttons (Call next, Start, Complete, Hold, No-show, Triage), inline status banner.
- `frontend/src/features/triage/`
  - `api.ts` — `useRecordTriage` + `useTriageByVisit` with `mutateAsync` exposed.
  - `TriagePage.tsx` — 5-button MTS selector (Red/Orange/Yellow/Green/Blue with target-time descriptions per docs 15), vitals input grid (temp, pulse, RR, SpO₂, BP sys/dia, pain 0–10), chief complaint + notes, navigates to `/queue/board/DOC` after save.
- `frontend/src/app/App.tsx` — new routes `/queue`, `/queue/check-in`, `/queue/board/:code`, `/queue/triage/:visitId`.
- `frontend/src/components/layout/AppShell.tsx` — Queue nav item gated by `queue.read` permission.
- `frontend/src/i18n/locales/{en,sw}.json` — new `queue:*` and `triage:*` namespaces (titles, statuses, station descriptions, MTS category labels + targets, vitals labels, form placeholders, action button labels). sw.json keeps parity with en.json.

**Why this slice**

- `docs/17-queue-management-design.md` — pipeline states, station codes, ticket format `{DEPT}-{NNN}` daily-reset.
- `docs/06-user-stories.md` UC-QUE-01, UC-TRI-01.
- `docs/08-rbac-matrix.md` — `queue.{read,list,manage,call-next,override-priority}`, `triage.{create,read,assign-category}`, `visits.{create,read,list}`.
- `docs/15-uiux-design-system.md` — fixed Manchester colors (`triage-red #DC2626`, etc.), target-time tokens.

**Notable decisions**

- `useBoard` polls every 4 s as the WS-fallback (spec 14 says Reverb pushes; polling is the degraded-mode behavior).
- Board uses `FIELD(mts_category,'red','orange','yellow','green','blue') ASC` ordering to match backend (the priority flow is set server-side; the FE just reflects it).
- `Patient.id` is a UUID (string) — the resource's external surface. For FK calls (e.g. `POST /visits`) we use `Patient.internal_id` instead. Future improvement: split `Visit.public_id` UUID for the route param.
- The Triage form pre-loads nothing — it's a fresh form per visit. The "triage for this visit" target is read off the `?ticket=` query param.
- No real-time WebSocket layer yet — `WSLaravel/Reverb` would be the next iteration; spec calls for `private-branch.{id}.queue` channel authorization.

---

## Earlier this session (same calendar day)

### Slice 2: Queue + Triage backend (complete + smoke-tested)

- **Migrations:** `queue_stations`, `queue_tickets`, `queue_events` (append-only), `visits`, `triage_assessments`. FKs to `appointments`/`queue_stations` deferred (modules not built yet).
- **Modules created from scratch:** `app/Modules/Queue/` and `app/Modules/Triage/`.
  - `Models/` — `QueueStation`, `QueueTicket`, `QueueEvent` (with booted() enforcing append-only), `Visit`, `TriageAssessment`. All bound to `BranchScope`.
  - `Repositories/Contracts/` + `Repositories/Eloquent/` — EloquentRepository base pattern (relaxed `find/create/update/delete` to `mixed/Model` to avoid LSP violations).
  - `Services/` — `QueueService` (openVisit / issueTicket / callNext / startServing / complete / hold / resume / markNoShow / emergencyBypass / updateMtsCategory / boardSnapshot), `TriageService` (recordAssessment).
  - `Http/Controllers/` — `QueueController`, `TriageController`. Thin.
  - `Http/Requests/` — `OpenVisitRequest`, `QueueActionRequest`, `RecordTriageRequest` with `authorize()` checking permissions.
  - `Http/Resources/` — JSON shape for stations, tickets, visits, triage.
  - `Providers/{Queue,Triage}ServiceProvider` — extends `Illuminate\Support\ServiceProvider`, auto-discovered by `App\Providers\ModuleServiceProvider` glob.
- **Console:** `queue:seed-stations` (creates REC/TRI/DOC/LAB/RAD/PHA/BIL per active branch, idempotent, disables BranchScope for CLI).
- **Permissions:** added `visits.{create,read,update,list,close}` to RBAC matrix; granted to `hospital-admin`, `receptionist`, `nurse`, `doctor`.
- **Middleware:** appended `SetActiveBranch` + `EnforceBranchScope` to the `api` middleware group so the BranchScope container binding is set on every request.
- **Bug fixes:**
  - `EloquentPatientRepository` etc. signatures relaxed to match parent `EloquentRepository`.
  - `DedupeMatcher` closure now uses `use ($probe)` explicitly.
  - `PatientService::update` converts Carbon `date_of_birth` → `Y-m-d` string before DTO.
  - `QueueService::openVisit` switched from `Collection::whereDate` to query builder.
  - Ticket format fixed: `{DEPT}-{NNN}` (e.g. `TRI-014`), scope `queue:{BRANCH}:{DEPT}:{DATE}`, prefix `TRI`. Earlier draft erroneously produced `REC-2026-06-23-001` (16-char column limit).
  - `EloquentQueueRepository::waitingAtStation` eager-loads `station` and `patient` to avoid lazy-load violations.

### Slice 1: Initial bootstrap + Auth + Branches + Patients

- Generated `APP_KEY`, ran `migrate:fresh --seed`, mirrored Spatie roles/permissions to sanctum guard via `permissions:mirror-to-sanctum`.
- Implemented `force.json` middleware alias, Spatie Gate::before hook (so `$user->can()` works on sanctum tokens without `web` guard mismatch).
- Fixed `documents` duplicate morphs index, `QueueTicket.number` ≤ 16 chars, soft-deleted legacy `mediflow_filament_*` schema items.
- Backend modules auto-discovered by glob `*ServiceProvider.php` inside each `Modules/{Name}/Providers/`.

---

## What I was just doing

> "finish what deleting the leftover codeo then create an md file named updates to document here we've reached, what we were doing and what we were about to do"

1. Cleaned up **leftover code from a botched `edit` in `TriagePage.tsx`** — there was a duplicate `onError` closure left behind after a previous fix.
2. Fixed **TypeScript errors** flagged by `tsc --noEmit`:
   - `useOpenVisit`/`useRecordTriage`/`useStartTicket` etc. needed to expose `mutateAsync` (not just `mutate`) because per-call `onSuccess` callbacks are an anti-pattern with TanStack Query's strict types. I unified on `mutateAsync` + try/catch.
   - `Patient.id` is a string UUID; the CheckInPage used `p.id` to set `patientId: number | null`. Switched to `p.internal_id` for the FK.
3. Verified `npm run type-check`, `lint`, `build`, `test` are all green.
4. Created this `updates.md`.

---

## What we were about to do next

The Queue + Triage slice is feature-complete at the API and UI level. Things still on the runway, in priority order:

### Immediate (same slice — tighten what's there)

- **Polish:** error toast for failed actions instead of inline banner, small loading skeletons, keyboard shortcut hints (`N` = next, `C` = complete). Low effort.
- **Permission-gate `triage` button** on the TRI board: the `canTriage` flag currently shows the button based on `triage.assign-category` but doesn't yet visually distinguish triage vs clinical buttons.
- **WebSocket layer** (Laravel Reverb on backend, Laravel Echo on frontend) for true realtime pushes instead of 4-s polling. Spec `09-system-architecture §7.4` + `14-frontend-architecture` §PWA. This is the *correct* next architectural step; polling is the degraded-mode fallback we shipped.

### Next slice (the obvious next patient journey step)

- **EMR (SOAP)** — once a visit is at Doctor (`DOC`), the doctor needs to open an encounter, write Subjective/Objective/Assessment/Plan, attach ICD-10 codes (problem list), and from the Plan launch lab orders / radiology orders / prescriptions.
- Spec anchors: `docs/06-user-stories.md` US-EMR-*, `07-use-cases.md` UC-EMR-01, `08-rbac-matrix.md` `emr.{create,read,update,sign,amend,view-history,list}` + `diagnoses.*` + `vitals.*`.
- Backend will need `encounters` table (FK from `visits.encounter_id` + `queue_tickets.encounter_id` are deferred — those migrations were left commented in the Queue migration).

### After EMR

- **Pharmacy dispense** (UC-PHA-01) — reads EMR prescriptions, FEFO stock decrement.
- **Lab orders → sample → result → release** (UC-LAB-01) — `LAB-{BRANCH}-YYMMDD-0001` sample IDs.
- **Billing + M-Pesa STK Push** (UC-BIL-01) — invoice generation + `MpesaDarajaGateway`.
- **SHA claims** (UC-INS-01) — `ShaGateway` implementation with claim state machine.
- **Inpatient / wards / beds / MAR** (UC-IPD-01) — `ADM-...` admissions, daily charges.

### Schema gaps from `audit-report.md` (deferred, address in the modules that need them)

- A4: `clinical_alerts`, `clinical_alert_items`, `alert_acknowledgements`, `alert_rules` — land with EMR / Pharmacy.
- A5: `pharmacy_stock` rollup — land with Pharmacy.
- A6: `stock_transfers`, `stock_transfer_items`, `stock_takes`, `stock_take_items` — land with Inventory.
- A7-A8: SHA tables + status enum extensions — land with Insurance.
- A9: `mpesa_transactions.initiated_by` FK → users — land with Billing.
- A10: `audit_logs.prev_hash`/`row_hash` + indexes — land with Audit.

### Cross-cutting (always-relevant)

- Tests: per spec 24, **SequenceService needs 100% coverage** + ClinicalAlerts/Billing/Auth/Tenancy ≥95% + Pharmacy/Lab/EMR ≥90%. We currently have 0 backend tests. Vitest has 3 trivial tests (`cn.test.ts`). Pest scaffold isn't even installed yet.
- Linting: **pest-arch test** for the module boundary rule (modules must not reach into other modules' `Models/` or `Repositories/Eloquent/`).
- Real MySQL test container in CI — docs 24 explicitly forbids SQLite for tests.
- Conventional Commits + Husky pre-commit (spec 26).
- Docker Compose + GitHub Actions CI (spec 25-26) — currently no CI.
- Reverb (`backend/.env` `REVERB_APP_ID/SECRET/KEY`) — needed before WS.

---

## Open follow-ups (no longer blocking but should track)

- **MFA enforcement** — seeded users for `hospital-admin`, `doctor`, `pharmacist` have `mfa_enabled=true` but `mfa_confirmed_at=null`. The `EnsureMfaConfirmed` middleware would force enrollment on first hit. For now, log in as `nurse` or `receptionist` (MFA-optional roles) to avoid the wall.
- **Duplicate roles in user** — `admin@afya.local` showed `roles:["hospital-admin","hospital-admin"]` earlier. The mirror command adds a second copy if the web-guard role is re-added. Fix: dedupe in `MirrorPermissionsToSanctum::handle()` before assigning.
- **Stale visit ID FK** — `visits.appointment_id` has no FK constraint because the `appointments` table doesn't exist yet. Add FK in a follow-up migration after Appointments module lands.
- **BranchScope in console** — `queue:seed-stations` manually disables the scope. Future CLI commands touching branch-scoped models should follow the same pattern.

---

## Reference: how to run

```
# Backend
cd D:\wamp\www\hospital\backend
"d:\wamp\bin\php\php8.3.28\php.exe" artisan serve --host=127.0.0.1 --port=8080

# Seed (idempotent)
"d:\wamp\bin\php\php8.3.28\php.exe" artisan db:seed --class=InitialSeeder
"d:\wamp\bin\php\php8.3.28\php.exe" artisan queue:seed-stations
"d:\wamp\bin\php\php8.3.28\php.exe" artisan permissions:mirror-to-sanctum

# Frontend
cd D:\wamp\www\hospital\frontend
npm run dev      # http://127.0.0.1:5173 (proxies /api → :8080)
npm run type-check
npm run lint
npm run build
npm test
```

**Login as any of these users (all password `ChangeMe!2025`):**
| Role | Email | Sees |
|---|---|---|
| Hospital Admin | `admin@afya.local` | All branches + every nav item |
| Doctor | `doctor@afya.local` | Patients, queue, EMR, prescribing, lab/rad orders |
| Nurse | `nurse@afya.local` | Triage, vitals, queue management |
| Receptionist | `receptionist@afya.local` | Patients, appointments, **check-in / queue** |
| Records Officer | `records@afya.local` | Patients, merge, documents |
| Pharmacist | `pharmacist@afya.local` | Pharmacy queue, dispense, stock |
| Lab Technician | `lab@afya.local` | LAB station board |
| Radiologist | `radiologist@afya.local` | RAD station board |
| Cashier | `cashier@afya.local` | Invoices, payments, SHA |
| Patient | `patient@afya.local` | Patient Portal (`/portal`) — Home, Appointments, Records, Results, Bills & Pay, Messages |

MFA-required roles (admin/doctor/pharmacist) currently force enrollment on first login. To avoid that wall during testing, log in as a non-MFA role first (e.g. `receptionist@afya.local`).

## Recent Updates (June 2026)

### Frontend Overhaul (Admin Modules)
- **Inventory Module**: Revamped to a sleek dashboard with stat cards and an interactive report modal for testing mock data.
- **Reports Module**: Implemented a responsive grid layout grouping reports by category with an interactive data viewer modal.
- **Audit Logs**: Transformed from a basic table into a premium, animated timeline view with filtering controls.
- **Branches**: Redesigned into a modern grid-card layout with glowing active indicators.
- **Settings**: Complete UI restructure introducing a clean sidebar navigation with smooth toggles for theme preferences and MFA.
- Fixed Missing Icons: Added several missing Lucide icons (e.g. `Monitor`, `Building2`, `Clock`, `ArrowLeft`) into `Icon.tsx` central registry and resolved duplicate import conflicts.

### Backend Fixes & Seeding
- **API Routing**: Fixed route definitions missing `api/v1` prefixes and Sanctum middleware for the Inventory, Audit, and Reporting modules so endpoints correctly resolve at `/api/v1/*`.
- **Branch Controller**: Fixed a `500 Internal Server Error` in `BranchController` by correcting the missing `App\Modules\Tenancy\Models\Branch` model import.
- **InventoryItem Model**: Fixed another `500 Internal Server Error` in `InventoryItem` model by correcting the missing `Branch` model import.
- **Database Schema**: Fixed a migration bug in `patients_tables` where encrypted PHI fields (`national_id` and `sha_number`) were configured with a restrictive length (40 chars), causing truncation errors during database seeding. Extended lengths to `255` characters.
- **Patient Seed Data**: Removed static placeholder mock data and implemented a dedicated `PatientSeeder` using Faker's `en_KE` locale. The seeder now automatically generates 20 realistic patient profiles.
- **Patient Portal Accounts**: Modified the seeder so that each generated patient is automatically linked to a newly generated `User` account with the `patient` role (allowing portal login access).
- **Authentication Permissions Bug**: Fixed a `500 Internal Server Error` on the `/api/v1/patients` endpoint (and others) caused by Spatie Permission resolution failures under the Sanctum guard. Explicitly defined `protected $guard_name = 'web';` on the `User` model so API requests properly fall back to the seeded web permissions.

### Patient Portal — MVP Build

The Patient Portal has been built from scratch as a **dedicated, mobile-first SPA shell** separate from the staff admin dashboard, as specified in `docs/15-uiux-design-system.md §6.12` and `docs/02-prd.md §6.16`.

#### Routing & Architecture
- Added `/portal/*` route group in `frontend/src/app/App.tsx` using a dedicated `PortalShell` layout (does NOT share the admin `AppShell`).
- Updated `frontend/src/config/navigation.ts` so users with the `patient` role are automatically redirected to `/portal` after login instead of the staff dashboard.
- Created a barrel file `frontend/src/features/portal/index.ts` to fix IDE module resolution false-positives and enforce clean import patterns.

#### New Components (`frontend/src/features/portal/`)
| File | Description |
|---|---|
| `PortalShell.tsx` | Top-nav layout with mobile hamburger drawer, theme toggle, user avatar dropdown, and sign-out action. |
| `PortalHome.tsx` | Dashboard with personalized welcome, next appointment card, outstanding bill card (M-Pesa CTA), recent lab results, active prescriptions, and quick-action buttons. |
| `PortalAppointments.tsx` | Tabbed view (Upcoming / Past) with appointment date-block cards; reschedule and cancel actions on upcoming visits; "Book Appointment" CTA. |
| `PortalRecords.tsx` | Tabbed view (Prescriptions / Clinical Documents); prescription cards show dosage, instructions, status, and refills remaining; document cards show type, provider, summary, and download action. |
| `PortalResults.tsx` | Pending results shown with animated "Processing" badge; available results expand via accordion to reveal full lab value tables (with H/L flags) or radiology report summaries. |
| `PortalBills.tsx` | Gradient hero card showing total outstanding balance with "Pay All with M-Pesa"; per-invoice breakdown with amount, services, and individual pay buttons; simulated M-Pesa STK push loading state and success toast. |
| `PortalMessages.tsx` | Two-panel inbox with message list and chat-bubble thread view; inline reply box; "New Message" form with provider/department selector. |

#### Icon Registry Extensions
- Added `MessageSquare` (`message`) and `Download` (`download`) icons to `frontend/src/components/icons/Icon.tsx` to support portal UI elements.

#### Test Credentials
Patients generated by `PatientSeeder` can log into the portal. A sample account:
| Role | Email | Password |
|---|---|---|
| Patient | `patient@afya.local` | `ChangeMe!2025` |

All seeded patient accounts (20 total) follow the pattern `[firstname].[lastname]@patient.afya.local` with the same default password.

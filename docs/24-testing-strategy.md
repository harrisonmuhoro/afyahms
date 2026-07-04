# 24 — Testing Strategy

> **Scope:** End-to-end quality assurance strategy for Afya HMS — backend (Laravel 11 / PHP 8.3+), frontend (React 18 / TypeScript strict / Vite), the contract between them, and the non-functional dimensions (performance, security, accessibility) that a production multi-branch hospital system in Kenya must satisfy before any release.
> **Authority:** Subordinate to `00-foundation.md`. Implements the testing mandate in foundation §14 (Pest/PHPUnit backend; Vitest + RTL + Playwright frontend; **≥80% coverage**) and the NFR quality gates in `05-non-functional-requirements.md`. Where any other document conflicts on test tooling or thresholds, foundation wins, then this document.
> **Audience:** Backend & frontend engineers, QA, DevOps/CI owners, and reviewers enforcing the Definition of Done.
> **Document version:** 1.0 · **Status:** Testing baseline

---

## 1. Testing philosophy & the test pyramid

### 1.1 Why we test the way we do

Afya HMS is **clinical software**. A regression in a drug-interaction rule, a branch-scope leak that exposes one branch's patients to another, or a rounding error in an M-Pesa reconciliation is not a cosmetic defect — it is a patient-safety, privacy (Kenya Data Protection Act 2019), or financial-integrity incident. Our testing strategy is therefore **risk-weighted, not uniformly distributed**: the clinical, billing, security and tenancy modules carry the heaviest test burden and the highest coverage floors; presentational concerns carry the lightest.

Five tenets govern every test decision:

| Tenet | Consequence |
|---|---|
| **Test behavior, not implementation** | Assert on outputs, side-effects, and contracts. Refactors that preserve behavior must not break tests. We do not assert on private method calls or internal Eloquent query shapes. |
| **Fast feedback first** | The bulk of value comes from a large, sub-second unit suite that runs on every save and pre-commit. Slow, brittle tests are pushed up the pyramid and run less often. |
| **Deterministic & isolated** | No test depends on wall-clock time, network, ordering, or another test's leftover state. Time is frozen (`travelTo`), external I/O is faked, the DB is reset per test. |
| **Risk-weighted coverage** | Coverage floors scale with blast radius: clinical/billing/security/tenancy ≥ 95%; general domain ≥ 85%; overall ≥ 80% (foundation §14). |
| **Tests are documentation** | A reading of the feature/E2E suite should describe what the system does. Names are sentences (`it('blocks dispensing when an allergy conflict is unacknowledged')`). |

### 1.2 The pyramid (and where we deliberately diverge)

```
                ▲  fewer, slower, broader
       ┌────────────────────┐
       │   E2E (Playwright)  │   ~5%   critical user journeys, real browser
       ├────────────────────┤
       │  Feature / HTTP     │  ~20%   API endpoints: auth, RBAC, branch scope,
       │  (Pest feature)     │         validation, DB round-trip, queues faked
       ├────────────────────┤
       │  Integration        │  ~15%   real MySQL/Redis, queue workers, gateway
       │                     │         mocks (Daraja/SHA/OpenFDA/AfricasTalking)
       ├────────────────────┤
       │   Unit              │  ~60%   services, DTOs, domain rules, Zod, hooks,
       │  (Pest / Vitest)    │         stores, pure functions — no I/O
       └────────────────────┘
                ▼  many, fast, narrow
```

| Layer | Target proportion | Runtime budget | Runs |
|---|---|---|---|
| Unit | ~60% of test count | Whole layer < 30 s | Every save (watch), pre-commit, CI |
| Integration | ~15% | < 2 min | Pre-push, CI |
| Feature / HTTP | ~20% | < 4 min | Pre-push, CI |
| E2E | ~5% | < 8 min (sharded) | CI on PR + nightly full matrix |

**Deliberate divergence from a strict pyramid:** Laravel's "feature" tests are cheap and high-value (a single test exercises route → middleware → FormRequest → service → repository → DB), so Afya runs a *heavier* feature layer than a classic pyramid would suggest. We accept this — these tests catch the integration bugs that matter (auth, scoping, validation) at a fraction of E2E cost. The anti-pattern we avoid is the "ice-cream cone" (mostly E2E), which is slow, flaky, and expensive to maintain.

### 1.3 Test taxonomy & directory map

| Test type | Backend location | Frontend location | Reset / isolation |
|---|---|---|---|
| Unit | `tests/Unit` | `src/**/__tests__/*.test.ts(x)` (colocated) | Pure; no DB. `Bus::fake()` etc. as needed |
| Integration | `tests/Integration` | n/a (covered by MSW + hook tests) | `RefreshDatabase`, real Redis, real queue worker |
| Feature/HTTP | `tests/Feature/{Module}` | n/a | `RefreshDatabase`, fakes for external I/O |
| Contract | `tests/Contract` | `src/contracts/__tests__` | Shared schema fixtures |
| E2E | n/a | `e2e/*.spec.ts` (Playwright) | Seeded test DB, isolated browser context per test |
| Performance | `k6/*.js` | — | Dedicated load environment |
| Security | CI jobs (SAST/DAST/deps) | CI jobs | — |
| Accessibility | — | `e2e/a11y/*.spec.ts` + Vitest+axe | — |

---

## 2. Backend testing (Laravel 11 · Pest + PHPUnit)

### 2.1 Tooling & configuration

- **Pest 3** as the primary runner (expressive `it()`/`describe()` syntax) on top of **PHPUnit 11**. Mixed: domain/unit tests are Pest functional style; some legacy/3rd-party assertions use PHPUnit classes — both run under one `phpunit.xml`.
- **`pestphp/pest-plugin-laravel`** for `get()/post()/actingAs()` helpers and Laravel-specific expectations.
- **Coverage:** Xdebug or PCOV driver; `--coverage --min=80` in CI. PCOV in CI for speed; Xdebug locally for branch coverage.
- **Parallel:** `php artisan test --parallel` (ParaTest) with per-process MySQL databases (`TEST_TOKEN`-suffixed) for the integration/feature suites.
- **Mutation:** `infection/infection` (see §8).

`phpunit.xml` (essentials):

```xml
<phpunit bootstrap="vendor/autoload.php" colors="true" cacheDirectory=".phpunit.cache">
  <testsuites>
    <testsuite name="Unit"><directory>tests/Unit</directory></testsuite>
    <testsuite name="Integration"><directory>tests/Integration</directory></testsuite>
    <testsuite name="Feature"><directory>tests/Feature</directory></testsuite>
    <testsuite name="Contract"><directory>tests/Contract</directory></testsuite>
  </testsuites>
  <source>
    <include><directory suffix=".php">app</directory></include>
    <exclude>
      <directory>app/Console</directory>
      <file>app/Providers/*ServiceProvider.php</file>
    </exclude>
  </source>
  <php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="mysql"/>
    <env name="DB_DATABASE" value="afya_test"/>
    <env name="CACHE_STORE" value="array"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="MAIL_MAILER" value="array"/>
    <env name="BCRYPT_ROUNDS" value="4"/>
  </php>
</phpunit>
```

> **DB choice for tests:** We test against **real MySQL 8** (not SQLite), because Afya relies on MySQL-specific behavior — `SELECT ... FOR UPDATE` in `SequenceService`, `DECIMAL(12,2)` money semantics, generated columns, JSON paths, and FK/`ON DELETE` behavior. SQLite would give false greens. CI spins up a MySQL service container; integration tests that need row-locking concurrency use real connections (§2.4).

### 2.2 Unit tests — services, DTOs, domain logic

Unit tests exercise a class in isolation, with collaborators stubbed/mocked. They never touch the DB, Redis, the network, or the clock (frozen). Targets:

**Services (business rules).** Each service method gets: happy path, each branch of its conditional logic, each thrown exception/guard, and boundary values.

**DTOs (`spatie/laravel-data`).** Construction from request payload, from model, `toArray()`/transformation, casts (money → `Money`/`DECIMAL` string, dates → `Africa/Nairobi` rendering), and validation rules attached to the data object.

**SequenceService** (foundation §6) — the only writer of `sequences`. Unit-test the format assembly and scope key derivation; concurrency/locking is verified in integration (§2.4).

```php
// tests/Unit/Sequence/SequenceFormatTest.php
use App\Modules\Shared\Sequence\SequenceService;

it('formats a per-year patient number zero-padded to 6', function () {
    $svc = new SequenceService(fakeRepoReturning(scope: 'patient:2026', value: 42));

    expect($svc->format('patient', year: 2026))
        ->toBe('PAT-2026-000042');
});

it('formats a per-branch per-year invoice number', function () {
    $svc = new SequenceService(fakeRepoReturning(scope: 'invoice:NRB:2026', value: 1934));

    expect($svc->format('invoice', branch: 'NRB', year: 2026))
        ->toBe('INV-NRB-2026-001934');
});

it('derives a daily-reset queue ticket per department', function () {
    $svc = new SequenceService(fakeRepoReturning(scope: 'queue:NRB:TRI:2026-06-22', value: 14));

    expect($svc->format('queue', branch: 'NRB', dept: 'TRI', date: '2026-06-22'))
        ->toBe('TRI-014');
});
```

**ClinicalAlertEngine rules** (`18-clinical-alerts-design.md`) — the highest-stakes unit suite. Every rule type is a pure evaluator over (matched data → finding + severity). We unit-test each rule against a table of clinical scenarios, asserting severity, blocking behavior, and de-duplication keys, **without** the DB or OpenFDA:

```php
// tests/Unit/ClinicalAlerts/AllergyRuleTest.php
use App\Modules\ClinicalAlerts\Rules\AllergyConflictRule;
use App\Modules\ClinicalAlerts\DTO\PrescriptionContext;

it('raises a critical, blocking allergy conflict when drug matches a documented allergen', function () {
    $rule = new AllergyConflictRule();

    $finding = $rule->evaluate(new PrescriptionContext(
        drugRxNorm: 'amoxicillin',
        allergens: ['penicillin'],     // cross-class allergen
        crossReactivityMap: penicillinCrossReactivity(),
    ));

    expect($finding)->not->toBeNull()
        ->and($finding->severity)->toBe('critical')
        ->and($finding->blocking)->toBeTrue()
        ->and($finding->dedupeKey)->toBe('allergy:amoxicillin:penicillin');
});

it('stays silent when no allergen overlaps', function () {
    $rule = new AllergyConflictRule();
    expect($rule->evaluate(new PrescriptionContext(
        drugRxNorm: 'paracetamol', allergens: ['penicillin'], crossReactivityMap: [],
    )))->toBeNull();
});

it('maps dataset interaction severity onto engine severity', function (string $datasetSeverity, string $expected, bool $blocking) {
    $rule = new DrugInteractionRule(localInteractionDataset());
    $f = $rule->evaluate(interactingPair('warfarin', 'aspirin', $datasetSeverity));
    expect($f->severity)->toBe($expected)->and($f->blocking)->toBe($blocking);
})->with([
    'major'    => ['major', 'critical', true],
    'moderate' => ['moderate', 'warning', false],
    'minor'    => ['minor', 'info', false],
]);
```

> **Fail-safe assertion (foundation tenet "safe when the internet is not"):** a dedicated test injects an OpenFDA client that throws/times out and asserts the engine still returns local findings and never swallows a conflict (degrade-not-disable).

**Other unit-tested domain logic:** Manchester Triage priority resolver (`12` §triage), queue pipeline transition guards (`17`), money calculations in Billing (line totals, tax, SHA copay split, rounding to `DECIMAL(12,2)`), `BranchScope` predicate construction, password/MFA policy helpers, signed-URL TTL math.

### 2.3 Feature / HTTP tests — endpoints, auth, RBAC, branch scope, validation

Feature tests hit real routes through the full middleware stack with `RefreshDatabase`. For **every write endpoint** we assert the cross-cutting matrix:

1. **Authentication** — `401` when unauthenticated (Sanctum).
2. **Authorization (RBAC)** — `403` for a role lacking the `{module}.{action}` permission (Spatie); `2xx` for one that has it. Driven from `08-rbac-matrix.md`.
3. **Branch scoping (tenancy, foundation §4)** — a user in branch `NRB` cannot read/update a `MSA` resource (`404`/`403`); `branch.view-all` roles can. **Every** resourceful endpoint gets a cross-branch leak test.
4. **Validation** — each FormRequest rule: required, type, format, uniqueness, domain constraints; assert `422` + the exact error key.
5. **Side-effects** — events dispatched, notifications queued, audit row written (asserted via fakes, §2.5).
6. **Response shape** — JSON Resource structure matches the API spec (`12-api-specification.md`).

```php
// tests/Feature/Patients/RegisterPatientTest.php
use App\Models\{User, Branch, Patient};
use App\Events\PatientRegistered;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->nrb = Branch::factory()->create(['code' => 'NRB']);
    $this->msa = Branch::factory()->create(['code' => 'MSA']);
});

it('requires authentication', function () {
    $this->postJson('/api/v1/patients', [])->assertUnauthorized();
});

it('forbids a role without patients.create', function () {
    $cashier = User::factory()->withRole('cashier')->inBranch($this->nrb)->create();
    $this->actingAs($cashier)
        ->postJson('/api/v1/patients', validPatientPayload())
        ->assertForbidden();
});

it('registers a patient and issues a PAT-YYYY sequence', function () {
    Event::fake([PatientRegistered::class]);
    $recordsOfficer = User::factory()->withRole('records-officer')->inBranch($this->nrb)->create();

    $res = $this->actingAs($recordsOfficer)
        ->postJson('/api/v1/patients', validPatientPayload());

    $res->assertCreated()
        ->assertJsonPath('data.patient_number', fn ($n) => str($n)->startsWith('PAT-2026-'))
        ->assertJsonStructure(['data' => ['public_id', 'patient_number', 'full_name', 'branch']]);

    $this->assertDatabaseHas('patients', ['branch_id' => $this->nrb->id]);
    Event::assertDispatched(PatientRegistered::class);
});

it('does not leak patients across branches', function () {
    $other = Patient::factory()->for($this->msa)->create();
    $nrbUser = User::factory()->withRole('records-officer')->inBranch($this->nrb)->create();

    $this->actingAs($nrbUser)
        ->getJson("/api/v1/patients/{$other->public_id}")
        ->assertNotFound();             // BranchScope filters it out entirely
});

it('lets a branch.view-all admin read any branch', function () {
    $other = Patient::factory()->for($this->msa)->create();
    $admin = User::factory()->withRole('hospital-admin')->inBranch($this->nrb)->create();

    $this->actingAs($admin)
        ->getJson("/api/v1/patients/{$other->public_id}")
        ->assertOk();
});

it('validates the national id and rejects duplicates', function () {
    $officer = User::factory()->withRole('records-officer')->inBranch($this->nrb)->create();

    $this->actingAs($officer)
        ->postJson('/api/v1/patients', ['national_id' => 'abc'])  // bad format + missing fields
        ->assertStatus(422)
        ->assertJsonValidationErrors(['national_id', 'first_name', 'date_of_birth']);
});
```

**MFA gate** (foundation §5 — required for `hospital-admin`, `doctor`, `pharmacist`): a feature test asserts these roles are challenged for a TOTP code and that protected endpoints return `423`/`forbidden` until MFA is satisfied, while non-privileged roles are not challenged.

**Datasets for the matrix.** RBAC and branch-scope checks are written once as a parameterized dataset and reused across endpoints to keep the matrix exhaustive without copy-paste:

```php
dataset('roles_without_dispense', ['doctor', 'nurse', 'receptionist', 'records-officer', 'cashier', 'lab-technician']);

it('only a pharmacist may dispense', function (string $role) {
    $user = User::factory()->withRole($role)->create();
    $this->actingAs($user)->postJson($dispenseUrl, dispensePayload())->assertForbidden();
})->with('roles_without_dispense');
```

### 2.4 Integration tests — DB, Redis, queues, external gateways

Integration tests verify the seams where Afya meets infrastructure or third parties. They use **real MySQL and real Redis** (CI service containers) and, where relevant, a real queue worker.

**Database & concurrency.** `SequenceService` is the canonical concurrency test: two transactions racing for the same scope must not collide, thanks to `SELECT ... FOR UPDATE`.

```php
// tests/Integration/Sequence/SequenceConcurrencyTest.php
it('never issues a duplicate sequence under concurrent writers', function () {
    Branch::factory()->create(['code' => 'NRB']);

    // Spawn N parallel processes hitting the same scope; collect results.
    $numbers = runConcurrently(processes: 20, fn () =>
        app(SequenceService::class)->next('invoice', branch: 'NRB', year: 2026)
    );

    expect($numbers)->toHaveCount(20)
        ->and(array_unique($numbers))->toHaveCount(20);   // all distinct, no gaps tolerated to break uniqueness
})->group('integration', 'concurrency');
```

**Redis & queue-management real-time state** (`17`): assert queue board state transitions, priority/emergency bypass ordering, and TTL/daily-reset keys behave against a real Redis instance.

**Queues & broadcasting.** Integration-level tests dispatch a job to a real queue connection and run the worker (`Queue::pop`) to assert the job's effects (e.g., a `SendAppointmentReminder` job actually invokes the notification channel mock).

**External gateways — mocked at the HTTP boundary, never hitting real endpoints.** We use `Http::fake()` (Laravel HTTP client) and recorded fixtures. Each gateway has: success, failure, timeout, and malformed-response cases, plus idempotency.

- **M-Pesa Daraja** (`MpesaDarajaGateway`): STK Push request shape, OAuth token caching, and the **signed, idempotent callback** route — replaying a callback with the same `CheckoutRequestID`/`mpesa_receipt` must not double-credit (foundation §9).
- **SHA** (`ShaGateway`): claim submission, pre-auth, status polling; assert claim number `CLM-{BRANCH}-YYYY-...` and graceful handling of insurer downtime.
- **OpenFDA**: enrichment-only — assert a 5xx/timeout degrades to local data (ties to §2.2 fail-safe).
- **AfricasTalking** (SMS via `NotificationChannelManager`): payload shape, provider-switch via config, and retry on transient failure.

```php
// tests/Integration/Billing/MpesaCallbackIdempotencyTest.php
use Illuminate\Support\Facades\Http;

it('credits an invoice once even if Daraja replays the callback', function () {
    $invoice = Invoice::factory()->unpaid()->create(['total' => '1500.00']);
    $payload = darajaSuccessCallback($invoice, receipt: 'QABC123', checkoutId: 'ws_CO_1');

    $first  = $this->postJson(signedCallbackUrl(), $payload)->assertOk();
    $replay = $this->postJson(signedCallbackUrl(), $payload)->assertOk();   // same IDs

    expect(Payment::where('mpesa_receipt', 'QABC123')->count())->toBe(1);
    expect($invoice->fresh()->status)->toBe('paid');
})->group('integration');

it('rejects an unsigned Daraja callback', function () {
    $this->postJson('/api/v1/webhooks/mpesa', darajaSuccessCallback())   // no signature
        ->assertForbidden();
});
```

### 2.5 Factories, seeders, RefreshDatabase, and faking

**Model factories** exist for every domain model, with **states** that encode meaningful domain conditions, and **fluent helpers** for tenancy/roles:

```php
// database/factories/PatientFactory.php
public function definition(): array {
    return [
        'public_id'      => (string) Str::uuid(),
        'branch_id'      => Branch::factory(),
        'patient_number' => null, // assigned by SequenceService on create in real flow
        'first_name'     => fake()->firstName(),
        'national_id'    => fake()->numerify('########'),
        'date_of_birth'  => fake()->dateTimeBetween('-90 years', '-1 year'),
    ];
}
public function withAllergy(string $allergen): static {
    return $this->afterCreating(fn (Patient $p) => $p->allergies()->create(['allergen' => $allergen]));
}

// UserFactory helpers used across the suite
public function withRole(string $slug): static { /* assignRole($slug) after creating */ }
public function inBranch(Branch $b): static    { /* set home + active branch */ }
```

**Seeders** are split: `RolesPermissionsSeeder` (the 10 roles + permission matrix — foundation §5/`08`), `ReferenceDataSeeder` (ICD-10, drug catalog master, branches), and `DemoSeeder` (E2E/manual data). Reference seeders run inside the test bootstrap so global data exists; per-test data comes from factories.

**`RefreshDatabase`** is the default trait for feature/integration suites — migrations once, transaction-wrapped rollback per test. Unit tests use **no** DB trait.

**Faking external effects** (the four pillars):

| Fake | Used for | Example assertion |
|---|---|---|
| `Event::fake([...])` | Domain events without running listeners | `Event::assertDispatched(PatientRegistered::class)` |
| `Bus::fake()` / `Queue::fake()` | Jobs queued but not executed | `Bus::assertDispatched(GenerateInvoicePdf::class)` |
| `Notification::fake()` | SMS/email not really sent | `Notification::assertSentTo($patient, AppointmentReminder::class)` |
| `Storage::fake('documents')` | Clinical document uploads | `Storage::disk('documents')->assertExists($path)` + signed-URL TTL check |
| `Http::fake([...])` | Daraja/SHA/OpenFDA/AfricasTalking | `Http::assertSent(fn ($r) => $r->url() === ... )` |
| `Date::setTestNow()` / `travelTo()` | Frozen clock for sequences, expiries, TTLs | deterministic `PAT-2026-...` |

> **Rule:** A test that asserts "a notification was sent" uses `Notification::fake()` (verify intent); a test that asserts "the SMS payload to AfricasTalking is well-formed" uses `Http::fake()` at the channel boundary (verify wire format). Both exist for the notification path.

### 2.6 Pest conventions

- One behavior per `it()`; names read as sentences.
- `describe()` groups by behavior, not by method.
- Shared setup in `beforeEach`; shared helpers in `tests/Pest.php` and `tests/Helpers/*`.
- `->with([...])` datasets for matrices (roles, branches, validation cases, severities).
- `->group('integration'|'concurrency'|'slow')` so CI can stage suites.
- Custom expectations for domain concepts: `expect($n)->toBeValidPatientNumber()`, `expect($alert)->toBeBlocking()`.

---

## 3. Frontend testing (Vitest + RTL + Playwright)

### 3.1 Tooling

- **Vitest** (Vite-native, fast, ESM) as the unit/component/integration runner; `jsdom` environment.
- **React Testing Library (RTL)** — query by role/label/text (accessible queries), never by class or test-id unless unavoidable; `@testing-library/user-event` for realistic interaction.
- **MSW (Mock Service Worker)** — intercepts `fetch` at the network layer for component/hook/integration tests; the *same* handlers back Storybook and (optionally) local dev.
- **`@testing-library/jest-dom`** matchers, **`vitest-axe`** for component-level a11y assertions.
- **Coverage:** `vitest run --coverage` (v8 provider), thresholds enforced in `vitest.config.ts`.
- **Playwright** for E2E in real Chromium/Firefox/WebKit.

`vitest.config.ts` thresholds (mirrors §6):

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],      // jest-dom, axe, MSW server start/stop
  coverage: {
    provider: 'v8',
    thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    exclude: ['**/*.stories.tsx', 'src/test/**', '**/*.d.ts'],
  },
}
```

### 3.2 Component tests (Vitest + RTL)

Render through a **test harness** that wires the real providers (TanStack Query client with retries off, Zustand store, i18n, router, theme) so components behave as in production. Assert via accessible roles and visible text in both `en` and `sw` where copy is load-bearing.

```tsx
// src/features/patients/components/__tests__/PatientRegistrationForm.test.tsx
import { render, screen } from '@/test/harness';
import userEvent from '@testing-library/user-event';
import { PatientRegistrationForm } from '../PatientRegistrationForm';

it('shows a Zod validation error for an invalid national ID', async () => {
  render(<PatientRegistrationForm />);
  await userEvent.type(screen.getByLabelText(/national id/i), 'abc');
  await userEvent.click(screen.getByRole('button', { name: /register patient/i }));

  expect(await screen.findByText(/national id must be 8 digits/i)).toBeInTheDocument();
});

it('submits and shows the issued patient number on success', async () => {
  // MSW handler returns PAT-2026-000042
  render(<PatientRegistrationForm />);
  await fillValidForm();
  await userEvent.click(screen.getByRole('button', { name: /register patient/i }));

  expect(await screen.findByText(/PAT-2026-000042/)).toBeInTheDocument();
});
```

### 3.3 Hook tests

Custom hooks (TanStack Query wrappers, queue subscriptions, MFA flow) are tested with `renderHook` and MSW.

```tsx
// src/features/queue/hooks/__tests__/useQueueBoard.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { withProviders } from '@/test/harness';
import { useQueueBoard } from '../useQueueBoard';

it('orders emergency (red) tickets ahead of standard tickets', async () => {
  const { result } = renderHook(() => useQueueBoard('NRB', 'DOC'), { wrapper: withProviders });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const priorities = result.current.tickets.map(t => t.priority);
  expect(priorities[0]).toBe('red');                    // MTS bypass honored
  expect(priorities).toEqual([...priorities].sort(byManchesterPriority));
});
```

### 3.4 Store tests (Zustand)

Client/UI state stores (active branch, theme, queue filters) are pure and tested directly.

```ts
// src/stores/__tests__/branchStore.test.ts
import { useBranchStore } from '../branchStore';

beforeEach(() => useBranchStore.setState(useBranchStore.getInitialState()));

it('switches the active branch and persists it', () => {
  useBranchStore.getState().setActiveBranch({ id: 2, code: 'MSA' });
  expect(useBranchStore.getState().activeBranch?.code).toBe('MSA');
  expect(screen.getByRole('button', { name: /msa/i })).toBeInTheDocument();
});
```

### 3.5 Form + Zod validation tests

Because Zod schemas **mirror backend FormRequests** (foundation §10), schemas are unit-tested directly — fast, exhaustive, and the basis of contract testing (§4).

```ts
// src/features/patients/schema/__tests__/patientSchema.test.ts
import { patientSchema } from '../patientSchema';

it('rejects a malformed national id', () => {
  const r = patientSchema.safeParse({ ...valid, national_id: 'abc' });
  expect(r.success).toBe(false);
  expect(r.error!.issues[0].path).toEqual(['national_id']);
});

it.each([
  ['future dob', { date_of_birth: '2099-01-01' }],
  ['empty name', { first_name: '' }],
])('rejects %s', (_label, override) => {
  expect(patientSchema.safeParse({ ...valid, ...override }).success).toBe(false);
});
```

### 3.6 MSW for API mocking

Handlers live in `src/test/msw/handlers/*` keyed by API path, returning fixtures generated from the **shared types** (§4) so mocks cannot drift from the contract. Handlers cover success, `422` validation, `403` permission, and `5xx` error so components are tested against realistic failure modes (toast, retry, error boundary).

### 3.7 E2E (Playwright) — critical user journeys

E2E runs against a fully-seeded test stack (real backend + DB + Redis, MSW disabled). Each test gets an isolated browser context and a fresh, seeded actor. We cover **only the critical journeys** (per `06-user-stories.md` priorities), one happy path + key failure per journey:

| # | Journey | Key assertions |
|---|---|---|
| 1 | **Login + MFA** | Privileged role (doctor) is challenged for TOTP; wrong code rejected; correct code lands on dashboard; session persists. |
| 2 | **Register patient** | Receptionist/records officer registers; `PAT-2026-…` shown; patient searchable. |
| 3 | **Queue flow** | Ticket issued at reception; advances Reception→Triage→Doctor; emergency (red) bypasses; board updates in real time (WebSocket). |
| 4 | **Consultation** | Doctor records SOAP note, orders a drug; **clinical alert** fires (allergy/interaction); override-with-reason captured. |
| 5 | **Dispense** | Pharmacist dispenses an `RX-…`; blocked until allergy alert acknowledged; stock decremented. |
| 6 | **M-Pesa payment** | Cashier raises invoice `INV-NRB-2026-…`; STK push (Daraja sandbox/mock); callback marks invoice paid; receipt `RCP-…` printed. |
| 7 | **Patient portal** | Patient logs in, sees only their own records/results/invoices; cannot access another patient (authz). |

```ts
// e2e/consultation-alert.spec.ts
import { test, expect } from './fixtures';   // provides seeded actors + login helper

test('doctor is blocked by an allergy alert and overrides with a reason', async ({ page, loginAs }) => {
  await loginAs('doctor', { mfa: true });
  await page.goto('/queue/DOC');
  await page.getByRole('button', { name: /call next/i }).click();

  await page.getByRole('button', { name: /add prescription/i }).click();
  await page.getByLabel('Drug').fill('Amoxicillin');           // patient allergic to penicillin
  await page.getByRole('button', { name: /save/i }).click();

  const alert = page.getByRole('alertdialog', { name: /allergy conflict/i });
  await expect(alert).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm prescription/i })).toBeDisabled();

  await alert.getByLabel(/override reason/i).fill('Confirmed tolerance, prior course completed');
  await alert.getByRole('button', { name: /override/i }).click();
  await expect(page.getByText(/prescription added/i)).toBeVisible();
});
```

**Playwright conventions:** role-based locators (accessibility-first), network idle waits avoided in favor of explicit UI assertions, `test.use({ storageState })` for pre-authenticated non-MFA roles to cut runtime, sharding across CI workers, traces + video on failure, screenshots attached to the report.

---

## 4. Contract testing (FE ↔ BE)

The single largest source of integration bugs in a split SPA/API system is **drift** between what the backend returns/accepts and what the frontend expects. Afya prevents this with a layered contract strategy anchored on the foundation rule that **Zod schemas mirror FormRequests** (foundation §10).

1. **Source of truth: shared types from the API spec.** `12-api-specification.md` is backed by an **OpenAPI document** generated from Laravel (Scribe / spatie route attributes). From it we generate **TypeScript types** (`openapi-typescript`) into `src/contracts/`. The frontend imports these types; a CI job fails if the generated types differ from the committed ones (`git diff --exit-code`), forcing regeneration on any API change.

2. **Request contract (Zod ↔ FormRequest).** For each write endpoint, a contract test feeds a **shared fixture set** through *both* the Zod schema (FE) and the Laravel FormRequest (BE) and asserts they agree on accept/reject for every case. Fixtures live in a language-neutral JSON (`tests/contracts/patient.cases.json`) consumed by a Pest test and a Vitest test:

```php
// tests/Contract/PatientRequestContractTest.php
it('FormRequest agrees with the shared accept/reject cases', function (array $case) {
    $validator = validatorFor(StorePatientRequest::class, $case['payload']);
    expect($validator->passes())->toBe($case['valid']);
})->with(loadJsonCases('patient.cases.json'));
```

```ts
// src/contracts/__tests__/patient.contract.test.ts
import cases from '../../../tests/contracts/patient.cases.json';
it.each(cases)('Zod agrees ($description)', ({ payload, valid }) => {
  expect(patientSchema.safeParse(payload).success).toBe(valid);
});
```

3. **Response contract (DTO ↔ TS type).** Backend feature tests assert the JSON Resource against `assertJsonStructure`/an OpenAPI schema validator; the frontend asserts that MSW fixtures satisfy the generated TS type (compile-time) — so a Resource change that isn't reflected in the spec breaks the backend test, and a spec change that isn't regenerated breaks the FE type-check.

4. **Consumer-driven check in CI.** A nightly job runs the FE's MSW fixtures against the **real** backend (dockerized, seeded) and diffs structures, catching any field the spec missed.

> Net effect: an engineer cannot change a request rule, a response field, or an endpoint without a red build somewhere in BE, FE, or contract — drift becomes a compile/CI error, not a production 500.

---

## 5. Test data management & fixtures

| Concern | Approach |
|---|---|
| **Domain entities** | Model factories with states (§2.5). Never hand-built arrays for models. |
| **Global reference data** | Seeders run in the test bootstrap (`RolesPermissionsSeeder`, `ReferenceDataSeeder`). Deterministic IDs for branches/roles so tests can reference `NRB`/`doctor` by slug. |
| **Frozen time** | `travelTo('2026-06-22 09:00:00')` in `beforeEach` wherever sequences, expiries, or TTLs are asserted. |
| **PHI / privacy** | **No real patient data, ever.** All names/IDs are faker-generated. Kenyan-realistic generators (national ID format, +254 phone, Kiswahili names) via a custom Faker provider. |
| **External fixtures** | Recorded JSON for Daraja/SHA/OpenFDA/AfricasTalking responses under `tests/Fixtures/gateways/`, used by `Http::fake()` and MSW alike where shapes overlap. |
| **E2E seed** | A dedicated `E2ESeeder` builds a stable cast: branches NRB/MSA, one user per role, a handful of patients (one with a penicillin allergy for the alert journey), a priced service catalog. Reset between Playwright shards. |
| **Builders for clinical scenarios** | Helper builders (`aPatient()->withAllergy('penicillin')->inBranch('NRB')`) keep clinical setup readable. |

---

## 6. Coverage targets & CI enforcement

**Floors** (foundation §14 baseline of ≥80%, raised by risk):

| Area | Line coverage floor | Rationale |
|---|---|---|
| **Overall (backend + frontend)** | **≥ 80%** | Foundation mandate. |
| ClinicalAlerts (engine + rules) | **≥ 95%** | Patient safety. |
| Billing / Payments (Daraja, SHA, money math) | **≥ 95%** | Financial integrity, idempotency. |
| Auth / Security / MFA | **≥ 95%** | Account compromise blast radius. |
| Tenancy / BranchScope | **≥ 95%** | Cross-branch PHI leakage. |
| SequenceService | **100%** (lines + branches) | Identifier uniqueness is a hard invariant. |
| Pharmacy / Lab / EMR domain | **≥ 90%** | Clinical correctness. |
| General domain services | **≥ 85%** | — |
| Presentational React components | **≥ 70%** | Low blast radius; behavior covered higher up. |

**Enforcement.** Coverage is a **hard CI gate**, not advisory:

- Backend: `php artisan test --coverage --min=80`; module floors enforced by a small CI script parsing the Clover report per-namespace (fails the job if any module is below its floor).
- Frontend: Vitest `coverage.thresholds` (per-directory overrides for the high-risk features).
- **No merge** to `main`/`develop` if any gate is red. Coverage **may not decrease** on a PR (delta check against base branch).

---

## 7. Performance/load, security, and accessibility testing

### 7.1 Performance & load (k6)

Scenarios in `k6/` model the foundation's scale target (1,000 users now → architected for 10,000+):

| Scenario | Profile | Pass criteria (ties to `05-NFR`) |
|---|---|---|
| **Steady load** | 1,000 VUs, ramp 5 min, hold 30 min | p95 API latency < 400 ms; error rate < 0.5%. |
| **Peak / spike** | ramp 1k → 10k VUs over 10 min | No 5xx surge; graceful degradation; p99 < 1.5 s. |
| **Queue real-time** | 2,000 concurrent WebSocket subscribers to the queue board | Broadcast fan-out latency < 1 s p95; Redis CPU within budget. |
| **M-Pesa callback burst** | 200 callbacks/s | Idempotent, zero double-credit, queue drains. |
| **Sequence contention** | 500 concurrent invoice creations in one branch | Zero duplicate numbers (correctness under load). |

```js
// k6/queue_board_realtime.js (sketch)
import ws from 'k6/ws';
import { check } from 'k6';
export const options = { stages: [{ duration: '2m', target: 2000 }, { duration: '5m', target: 2000 }] };
export default function () {
  ws.connect(`${__ENV.WS_URL}/app/queue?branch=NRB`, {}, (socket) => {
    socket.on('message', (m) => check(m, { 'is queue update': (d) => d.includes('queue.updated') }));
    socket.setTimeout(() => socket.close(), 10000);
  });
}
```

Load tests run **nightly** and on release candidates against the staging/load environment (never production), with results trended over time to catch regressions.

### 7.2 Security testing

| Layer | Tooling | Gate |
|---|---|---|
| **SAST** (static) | Larastan/PHPStan (max level) for type-safety; `psalm`/`enlightn` security analyzer for Laravel-specific issues; ESLint security plugin for TS. | CI blocking. |
| **Dependency scanning** | `composer audit`, `npm audit`/`pnpm audit`, GitHub Dependabot, and Trivy on the Docker image. | CI blocking on high/critical CVEs. |
| **DAST** (dynamic) | OWASP ZAP baseline scan against the running staging app (auth + unauthenticated passes). | Nightly; high findings block release. |
| **Secrets** | Gitleaks pre-commit + CI history scan. | Blocking. |
| **Authz fuzzing** | The RBAC/branch-scope datasets (§2.3) are the primary defense — every endpoint proven to enforce permission + tenancy. Plus a targeted IDOR test sweep over `public_id`-addressed resources. | Blocking. |

Security-relevant behaviors with dedicated tests: signed-URL expiry for clinical documents, webhook signature verification (Daraja/SHA), rate-limit responses (`429`), audit-log immutability (`audit_logs` write cannot be updated/deleted), encrypted-cast columns never serialized in plaintext to API/logs.

### 7.3 Accessibility (axe)

UI must meet **WCAG 2.1 AA** (per `15-uiux-design-system.md`). Two tiers:

- **Component-level:** `vitest-axe` assertion in component tests — `expect(await axe(container)).toHaveNoViolations()` for every shared UI component and form.
- **Page-level (E2E):** `@axe-core/playwright` scans on each critical journey screen; violations of impact `serious`/`critical` fail the build. Plus explicit keyboard-navigation and focus-trap tests for modals (notably the blocking clinical-alert dialog).

---

## 8. Mutation testing (Infection)

Line coverage proves a line *ran*, not that a test would *catch a bug* in it. For the highest-stakes namespaces we add **mutation testing** with **`infection/infection`** (PHP) to measure assertion quality.

- **Scope:** `ClinicalAlerts`, `Billing`/Payments, `SequenceService`, `Auth`/MFA, `Tenancy`. (Running Infection over the whole app is too slow for every PR; we scope it.)
- **Target MSI (Mutation Score Indicator):** **≥ 85%** for these namespaces; **covered-code MSI ≥ 90%**.
- **How it works:** Infection mutates code (flip `>=` to `>`, negate conditionals, change return values) and re-runs the relevant tests; a surviving mutant means a behavior no test asserts (e.g., an off-by-one in sequence padding, or a severity boundary that flips silently).
- **CI:** runs nightly on the scoped namespaces and on PRs that touch them; MSI below threshold is a warning on general PRs and **blocking** on PRs modifying clinical/billing/security code.
- **Frontend note:** Stryker-JS is optional for the Zod schemas / money-formatting utilities; not yet a gate.

---

## 9. Test environments & CI integration

### 9.1 Environments

| Env | Purpose | Data | Externals |
|---|---|---|---|
| **Local** | Dev TDD loop | Factories + seeders, ephemeral MySQL/Redis (Docker Compose) | All faked/mocked |
| **CI** | Gated PR pipeline | Service-container MySQL 8 + Redis, fresh per job | All mocked (`Http::fake`, MSW); Daraja/SHA sandbox optional in nightly |
| **Staging / Load** | E2E, DAST, k6, UAT | Seeded `E2ESeeder` + anonymized volume data | **Sandbox** Daraja, SHA test, AfricasTalking sandbox |
| **Production** | — | Real PHI | **No tests run here** (synthetic uptime/health checks only) |

> Production-data realism without production data: staging volume is generated, never copied from prod (DPA 2019). Any prod incident reproduction uses a sanitized, field-masked snapshot.

### 9.2 CI pipeline (GitHub Actions, conceptual)

```
on: pull_request, push(develop|main)

jobs:
  lint:        Pint, PHPStan(max), ESLint, Prettier, tsc --noEmit            [blocking]
  contract:    regenerate OpenAPI types → git diff --exit-code               [blocking]
  unit-be:     pest --testsuite=Unit --parallel                              [blocking]
  feature-be:  pest --testsuite=Feature,Integration --parallel  (MySQL+Redis svc) [blocking]
  coverage-be: pest --coverage --min=80 + per-module floor script            [blocking]
  unit-fe:     vitest run --coverage  (thresholds)                           [blocking]
  contract-fe: vitest run src/contracts                                      [blocking]
  e2e:         playwright test --shard  (against docker-compose stack)       [blocking on PR]
  a11y:        axe page scans (part of e2e)                                  [blocking serious+]
  security:    composer audit, npm audit, gitleaks, larastan-security        [blocking high+]
  # nightly only:
  k6-load:     k6 run scenarios                                              [report+trend]
  dast-zap:    OWASP ZAP baseline vs staging                                 [release gate]
  mutation:    infection scoped namespaces (MSI ≥ 85%)                       [report; gate on touched]
```

- **Caching:** Composer + pnpm + Playwright browsers cached by lockfile hash.
- **Sharding:** Pest `--parallel` and Playwright `--shard` across runners to keep the PR pipeline under ~12 minutes.
- **Required checks:** `lint`, `contract`, all `*-be`, `unit-fe`, `contract-fe`, `e2e`, `security` must be green to merge (branch protection). Coverage delta must be ≥ 0.
- **Husky pre-commit / pre-push** (foundation §14): pre-commit runs Pint + ESLint + type-check + affected unit tests; pre-push runs the full unit suite. This shifts feedback left so CI rarely fails on lint/format.

---

## 10. Example test snippets (consolidated)

The sections above embed runnable examples per layer; this section pins the canonical "one per stack" reference an engineer copies when starting a new module.

**Pest (backend feature) — the cross-cutting endpoint template:**

```php
it('enforces auth, permission, branch scope and validation on create', function () {
    // 401
    $this->postJson($url, [])->assertUnauthorized();
    // 403 (wrong role)
    $this->actingAs(User::factory()->withRole('nurse')->create())->postJson($url, $valid)->assertForbidden();
    // 422 (bad payload)
    $this->actingAs($authorized)->postJson($url, $invalid)->assertJsonValidationErrors($expectedKeys);
    // 201 + side effects
    Event::fake(); Notification::fake();
    $this->actingAs($authorized)->postJson($url, $valid)->assertCreated();
    Event::assertDispatched($DomainEvent);
    // cross-branch isolation
    $this->actingAs($authorized)->getJson($otherBranchResourceUrl)->assertNotFound();
});
```

**Vitest + RTL (frontend component) — see §3.2** (`PatientRegistrationForm` validation + success).

**Playwright (E2E) — see §3.7** (`consultation-alert.spec.ts` allergy block + override).

(SequenceService unit/concurrency, ClinicalAlertEngine rule table, M-Pesa idempotency, Zustand store, Zod contract — see §2.2, §2.4, §3.4, §4.)

---

## 11. Definition of Done (testing)

A change is **Done** only when **all** of the following hold. Reviewers reject PRs that violate any item.

**For every change:**
- [ ] New/changed behavior has tests at the **lowest layer that proves it** (prefer unit; add feature/E2E for cross-cutting behavior).
- [ ] All suites green locally and in CI; no skipped/`->only`/`.skip` tests left behind.
- [ ] Coverage gate passes and **coverage did not decrease**; the relevant module is at or above its risk-based floor (§6).
- [ ] Lint, format (Pint/Prettier), static analysis (PHPStan max / `tsc --noEmit` strict, no `any`), and security scans pass.
- [ ] No real PHI or secrets in fixtures; faker/anonymized only.

**For a new/changed API endpoint:**
- [ ] Feature test asserts the full matrix: **401 / 403 (per RBAC) / branch-scope isolation / 422 validation / success + side-effects / response shape**.
- [ ] OpenAPI/spec updated and TS types regenerated (contract job green); Zod schema mirrors the FormRequest with a shared-case contract test.

**For clinical / billing / security / tenancy code (raised bar):**
- [ ] Module coverage ≥ its floor (95–100%, §6); Infection MSI ≥ 85% on touched namespaces (§8).
- [ ] Explicit tests for failure & abuse paths: gateway timeout/degrade (OpenFDA fail-safe), idempotent replays (Daraja/SHA), override-with-reason audit, cross-branch leak, IDOR via `public_id`.
- [ ] If user-facing: `axe` (component) passes and the journey's Playwright + page-level a11y scan is green; keyboard/focus tested for any modal.

**For a release candidate (in addition):**
- [ ] Full E2E matrix (all 7 critical journeys) green across the browser matrix.
- [ ] Nightly k6 load run meets latency/error budgets; DAST baseline has no unresolved high findings.

---

> **Maintenance:** This strategy is reviewed each time a new module is added to the bounded-context list (foundation §1) or a new external gateway is integrated (§2.4). Tooling versions track the lockfiles; thresholds in §6 are the contract and may only be raised, never lowered, without a foundation-level decision.

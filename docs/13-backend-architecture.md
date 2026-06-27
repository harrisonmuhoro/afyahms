# 13 — Backend Architecture

> **Scope:** The complete, opinionated backend architecture for Afya HMS — the modular-monolith
> layout, the layered request lifecycle, every supporting pattern (repositories, services, DTOs,
> events, domain services), and the cross-cutting concerns (RBAC, audit, caching, scheduling,
> broadcasting, error handling, coding standards).
>
> **Authority:** Subordinate to `00-foundation.md`. Where this document elaborates a constant
> defined there (identifiers, tenancy rule, role slugs, abstractions), the foundation wins on the
> value; this document owns the *implementation shape*.
>
> **Stack:** Laravel 11 · PHP 8.3+ · MySQL 8 · Redis · Sanctum · Spatie Permission · Spatie
> Activity Log · `spatie/laravel-data` · Laravel Reverb (broadcasting) · Pest.

---

## 1. Modular monolith layout

### 1.1 Strategy

Afya HMS is **one deployable Laravel application**. Internally it is decomposed into **bounded
modules** that live under `app/Modules/{Module}`. We deliberately do **not** ship modules as
Composer packages: the codebase is a single repository, deployed as one artifact, and a
package-per-module split would add publishing/versioning friction with no payoff for a single team
shipping one binary. The "package feel" (autonomy, clear boundaries) is achieved through directory
discipline, per-module service providers, and dependency rules — not through Composer.

**Module boundary rules (enforced in code review + later by a `deptrac`/`pest-arch` test):**

1. A module may depend on its own namespace freely.
2. Cross-module calls go through the **other module's Service layer or published Events** — never
   directly into another module's Repository or Model. (e.g. `Billing` asks `Patients` for a
   patient via `PatientService`/a read DTO, never `new Patient` lookups against another context.)
3. Shared, truly-global concerns (base classes, the `BranchScope`, `SequenceService`, money
   casts, the storage/notification/payment abstractions) live in `app/Support` and
   `app/Domain`, not inside any single business module.
4. No circular module dependencies. When two modules need each other, the shared contract is
   lifted into an interface in `app/Contracts` and the coupling is inverted.

### 1.2 Top-level directory map

```
app/
├── Console/
│   └── Kernel.php                 # scheduler definitions (delegates to module schedules)
├── Contracts/                     # cross-module interfaces (PaymentGateway, InsurerGateway, …)
│   ├── Payments/PaymentGateway.php
│   ├── Payments/InsurerGateway.php
│   ├── Storage/StorageManager.php
│   └── Notifications/NotificationChannelManager.php
├── Domain/                        # framework-agnostic shared domain (value objects, enums)
│   ├── Enums/
│   │   ├── TriageLevel.php         # Red/Orange/Yellow/Green/Blue (MTS)
│   │   ├── QueueStation.php
│   │   └── Money/Currency.php
│   └── ValueObjects/
│       └── Money.php
├── Exceptions/
│   ├── Handler.php
│   ├── DomainException.php         # base for all business-rule violations
│   └── Concerns/RendersApiErrors.php
├── Http/
│   ├── Middleware/
│   │   ├── ResolveActiveBranch.php
│   │   ├── EnsureMfaConfirmed.php
│   │   └── ForceJsonResponse.php
│   └── Kernel.php
├── Models/
│   └── User.php                    # the one cross-cutting model (auth identity)
├── Providers/
│   ├── AppServiceProvider.php
│   ├── AuthServiceProvider.php
│   ├── EventServiceProvider.php
│   ├── RouteServiceProvider.php
│   └── ModuleServiceProvider.php   # discovers & boots app/Modules/*/Providers
├── Support/                        # shared infrastructure used by all modules
│   ├── Concerns/HasBranchScope.php
│   ├── Casts/MoneyCast.php
│   ├── Eloquent/BranchScope.php     # global scope
│   ├── Repositories/BaseRepository.php
│   ├── Sequences/SequenceService.php
│   └── Http/ApiResource.php         # base JsonResource w/ envelope conventions
└── Modules/
    ├── Patients/
    ├── Billing/
    ├── EMR/
    ├── Pharmacy/
    └── …                            # one folder per bounded context in §1 of foundation
```

### 1.3 Sample module tree — `app/Modules/Patients`

Every module follows the **same internal shape** so any engineer can navigate any module blind.

```
app/Modules/Patients/
├── Providers/
│   └── PatientsServiceProvider.php      # binds repos, loads routes/migrations/policies
├── Routes/
│   └── api.php                          # routes prefixed /api/v1/patients
├── Database/
│   ├── Migrations/
│   │   └── 2026_01_10_000001_create_patients_table.php
│   ├── Factories/PatientFactory.php
│   └── Seeders/PatientDemoSeeder.php
├── Http/
│   ├── Controllers/
│   │   ├── PatientController.php
│   │   └── PatientMergeController.php
│   ├── Requests/
│   │   ├── StorePatientRequest.php
│   │   ├── UpdatePatientRequest.php
│   │   └── IndexPatientRequest.php
│   └── Resources/
│       ├── PatientResource.php
│       └── PatientCollection.php
├── Services/
│   ├── PatientService.php               # orchestration + transactions
│   └── PatientMergeService.php
├── Repositories/
│   ├── Contracts/PatientRepository.php  # interface
│   └── Eloquent/EloquentPatientRepository.php
├── Data/                                # DTOs (spatie/laravel-data)
│   ├── RegisterPatientData.php
│   ├── UpdatePatientData.php
│   └── PatientFilterData.php
├── Models/
│   └── Patient.php
├── Observers/
│   └── PatientObserver.php
├── Policies/
│   └── PatientPolicy.php
├── Events/
│   ├── PatientRegistered.php
│   └── PatientMerged.php
├── Listeners/
│   ├── SendPatientWelcomeSms.php
│   └── WritePatientAuditEntry.php
├── Jobs/
│   └── GeneratePatientCardPdf.php
├── Enums/
│   ├── Gender.php
│   └── PatientStatus.php
└── Tests/
    ├── Feature/RegisterPatientTest.php
    └── Unit/PatientServiceTest.php
```

### 1.4 Module service provider

Each module registers itself. `ModuleServiceProvider` (booted from `config/app.php`) iterates the
`app/Modules/*/Providers/*ServiceProvider.php` files and registers them, so adding a module is
"drop a folder, no central edit".

```php
<?php

namespace App\Modules\Patients\Providers;

use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Observers\PatientObserver;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use App\Modules\Patients\Repositories\Eloquent\EloquentPatientRepository;
use Illuminate\Support\ServiceProvider;

final class PatientsServiceProvider extends ServiceProvider
{
    /** Interface → implementation bindings for this module. */
    public array $bindings = [
        PatientRepository::class => EloquentPatientRepository::class,
    ];

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../Routes/api.php');
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Patient::observe(PatientObserver::class);
    }
}
```

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;

final class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        foreach (File::directories(app_path('Modules')) as $modulePath) {
            $module   = basename($modulePath);
            $provider = "App\\Modules\\{$module}\\Providers\\{$module}ServiceProvider";

            if (class_exists($provider)) {
                $this->app->register($provider);
            }
        }
    }
}
```

> Routes register a `Route::middleware(['auth:sanctum','branch'])->prefix('api/v1')` group; module
> route files only declare their own resource lines. The global `RouteServiceProvider` owns rate
> limiters and the `api/v1` version prefix.

---

## 2. Layered request lifecycle (concrete walk-through)

We trace **`POST /api/v1/patients`** end to end: `PatientController@store → StorePatientRequest →
PatientService::register → PatientRepository → Patient model → PatientResource`, with events firing
the side-effects.

```
HTTP POST /api/v1/patients
  → ResolveActiveBranch middleware      (sets context: active branch_id)
  → auth:sanctum                        (authenticated user)
  → StorePatientRequest                 (authorization + validation → RegisterPatientData DTO)
  → PatientController::store            (thin: delegate + return Resource)
      → PatientService::register(DTO)   (transaction, sequence, business rules)
          → SequenceService::next('patient:2026')   (PAT-2026-000042)
          → PatientRepository::create(attributes)    (Eloquent persistence)
              → Patient model           (BranchScope auto-stamps + filters branch_id)
          → event(PatientRegistered)    (queued listeners: SMS, audit, card PDF)
      ← Patient entity
  ← PatientResource                     (shape JSON envelope, 201)
```

### 2.1 Route

```php
// app/Modules/Patients/Routes/api.php
use App\Modules\Patients\Http\Controllers\PatientController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'branch'])
    ->prefix('api/v1')
    ->group(function (): void {
        Route::apiResource('patients', PatientController::class);
        Route::post('patients/{patient}/merge', [PatientMergeController::class, 'store'])
            ->name('patients.merge');
    });
```

### 2.2 Controller — thin

The controller never validates, never touches the DB, never builds business logic. It authorizes,
hands the validated DTO to the service, and wraps the result in a Resource.

```php
<?php

namespace App\Modules\Patients\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Data\RegisterPatientData;
use App\Modules\Patients\Http\Requests\StorePatientRequest;
use App\Modules\Patients\Http\Resources\PatientResource;
use App\Modules\Patients\Services\PatientService;
use Illuminate\Http\JsonResponse;

final class PatientController extends Controller
{
    public function __construct(private readonly PatientService $patients)
    {
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $patient = $this->patients->register(
            RegisterPatientData::from($request->validated()),
        );

        return PatientResource::make($patient)
            ->response()
            ->setStatusCode(201);
    }
}
```

### 2.3 FormRequest — authorization + validation, emits a DTO

All write endpoints use a FormRequest. Authorization lives here (delegating to the Policy/Gate);
validation rules live here; no validation leaks into the controller or service.

```php
<?php

namespace App\Modules\Patients\Http\Requests;

use App\Modules\Patients\Enums\Gender;
use App\Modules\Patients\Models\Patient;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Patient::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'first_name'    => ['required', 'string', 'max:80'],
            'last_name'     => ['required', 'string', 'max:80'],
            'national_id'   => ['nullable', 'string', 'max:20', Rule::unique('patients', 'national_id')
                                    ->where('branch_id', $this->user()->active_branch_id)],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'gender'        => ['required', new Enum(Gender::class)],
            'phone'         => ['required', 'string', 'regex:/^\+?254\d{9}$/'], // Kenyan MSISDN
            'sha_number'    => ['nullable', 'string', 'max:30'],
            'next_of_kin'              => ['nullable', 'array'],
            'next_of_kin.name'         => ['required_with:next_of_kin', 'string', 'max:120'],
            'next_of_kin.phone'        => ['required_with:next_of_kin', 'string', 'regex:/^\+?254\d{9}$/'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Phone must be a valid Kenyan number, e.g. +254712345678.',
        ];
    }
}
```

### 2.4 DTO — typed boundary object (`spatie/laravel-data`)

```php
<?php

namespace App\Modules\Patients\Data;

use App\Modules\Patients\Enums\Gender;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
final class RegisterPatientData extends Data
{
    public function __construct(
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly ?string $nationalId,
        public readonly string $dateOfBirth,
        public readonly Gender $gender,
        public readonly string $phone,
        public readonly ?string $shaNumber = null,
        public readonly ?NextOfKinData $nextOfKin = null,
    ) {
    }
}
```

### 2.5 Service — business logic, orchestration, transaction boundary

The service is the **only** place transactions are opened, the **only** caller of
`SequenceService`, and the place where cross-cutting events are dispatched.

```php
<?php

namespace App\Modules\Patients\Services;

use App\Modules\Patients\Data\RegisterPatientData;
use App\Modules\Patients\Events\PatientRegistered;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use App\Support\Sequences\SequenceService;
use Illuminate\Support\Facades\DB;

final class PatientService
{
    public function __construct(
        private readonly PatientRepository $repository,
        private readonly SequenceService $sequences,
    ) {
    }

    public function register(RegisterPatientData $data): Patient
    {
        $patient = DB::transaction(function () use ($data): Patient {
            $patientNumber = $this->sequences->next(
                scope: 'patient:' . now()->year,
                format: fn (int $n): string => sprintf('PAT-%d-%06d', now()->year, $n),
            );

            return $this->repository->create([
                'patient_number' => $patientNumber,
                'public_id'      => (string) \Illuminate\Support\Str::uuid(),
                'first_name'     => $data->firstName,
                'last_name'      => $data->lastName,
                'national_id'    => $data->nationalId,
                'date_of_birth'  => $data->dateOfBirth,
                'gender'         => $data->gender,
                'phone'          => $data->phone,
                'sha_number'     => $data->shaNumber,
                'next_of_kin'    => $data->nextOfKin?->toArray(),
            ]);
        });

        // Side-effects fire AFTER commit (listeners are queued; see §6).
        PatientRegistered::dispatch($patient);

        return $patient;
    }
}
```

### 2.6 Repository — interface + Eloquent implementation

```php
<?php

namespace App\Modules\Patients\Repositories\Contracts;

use App\Modules\Patients\Data\PatientFilterData;
use App\Modules\Patients\Models\Patient;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PatientRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Patient;

    public function findByPublicId(string $publicId): ?Patient;

    public function paginate(PatientFilterData $filter): LengthAwarePaginator;
}
```

```php
<?php

namespace App\Modules\Patients\Repositories\Eloquent;

use App\Modules\Patients\Data\PatientFilterData;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use App\Support\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentPatientRepository extends BaseRepository implements PatientRepository
{
    public function model(): string
    {
        return Patient::class;
    }

    public function create(array $attributes): Patient
    {
        return Patient::query()->create($attributes); // BranchScope stamps branch_id on creating
    }

    public function findByPublicId(string $publicId): ?Patient
    {
        return Patient::query()->where('public_id', $publicId)->first();
    }

    public function paginate(PatientFilterData $filter): LengthAwarePaginator
    {
        return Patient::query()
            ->when($filter->search, fn ($q, $term) => $q->where(
                fn ($q) => $q->where('first_name', 'like', "%{$term}%")
                    ->orWhere('last_name', 'like', "%{$term}%")
                    ->orWhere('patient_number', 'like', "%{$term}%")
            ))
            ->when($filter->status, fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->paginate($filter->perPage)
            ->withQueryString();
    }
}
```

### 2.7 Model

```php
<?php

namespace App\Modules\Patients\Models;

use App\Modules\Patients\Enums\Gender;
use App\Modules\Patients\Enums\PatientStatus;
use App\Support\Concerns\HasBranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

final class Patient extends Model
{
    use HasBranchScope;   // applies BranchScope + stamps branch_id (see §7.2)
    use SoftDeletes;      // clinical data is never hard-deleted (foundation §11)
    use LogsActivity;     // Spatie Activity Log (see §8.2)

    protected $fillable = [
        'patient_number', 'public_id', 'branch_id', 'first_name', 'last_name',
        'national_id', 'date_of_birth', 'gender', 'phone', 'sha_number',
        'next_of_kin', 'status',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'gender'        => Gender::class,
        'status'        => PatientStatus::class,
        'next_of_kin'   => 'array',
        'national_id'   => 'encrypted',   // PHI at rest (foundation §11)
    ];

    public function getRouteKeyName(): string
    {
        return 'public_id'; // route-model binding uses UUID, never the BIGINT id
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('patient');
    }
}
```

### 2.8 Resource — JSON shaping

```php
<?php

namespace App\Modules\Patients\Http\Resources;

use App\Support\Http\ApiResource;
use Illuminate\Http\Request;

/** @mixin \App\Modules\Patients\Models\Patient */
final class PatientResource extends ApiResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->public_id,          // expose UUID, hide BIGINT
            'patient_number' => $this->patient_number,
            'first_name'     => $this->first_name,
            'last_name'      => $this->last_name,
            'full_name'      => "{$this->first_name} {$this->last_name}",
            'date_of_birth'  => $this->date_of_birth?->toDateString(),
            'gender'         => $this->gender->value,
            'phone'          => $this->phone,
            'status'         => $this->status->value,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
```

### 2.9 Policy

```php
<?php

namespace App\Modules\Patients\Policies;

use App\Models\User;
use App\Modules\Patients\Models\Patient;

final class PatientPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('patients.view');
    }

    public function view(User $user, Patient $patient): bool
    {
        return $user->can('patients.view')
            && $user->canAccessBranch($patient->branch_id);
    }

    public function create(User $user): bool
    {
        return $user->can('patients.create');
    }

    public function update(User $user, Patient $patient): bool
    {
        return $user->can('patients.update')
            && $user->canAccessBranch($patient->branch_id);
    }

    public function delete(User $user, Patient $patient): bool
    {
        return $user->can('patients.delete')
            && $user->canAccessBranch($patient->branch_id);
    }
}
```

---

## 3. Repository pattern & container binding

### 3.1 Why repositories

- **Testability** — services depend on the interface; tests bind an in-memory fake.
- **Boundary enforcement** — cross-module code can only see another context's repository through
  its published interface (and per §1.1 should go through the service anyway).
- **Swap-ability** — read-heavy reporting can later swap an Eloquent impl for a read-replica or
  cached impl without touching service code.

### 3.2 Base repository

```php
<?php

namespace App\Support\Repositories;

use Illuminate\Database\Eloquent\Model;

abstract class BaseRepository
{
    /** @return class-string<Model> */
    abstract public function model(): string;

    public function find(int|string $id): ?Model
    {
        return $this->newQuery()->find($id);
    }

    public function findOrFail(int|string $id): Model
    {
        return $this->newQuery()->findOrFail($id);
    }

    protected function newQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return ($this->model())::query();
    }
}
```

### 3.3 Binding in the service provider

Interface → implementation is bound via the `$bindings` array on each module provider (see §1.4).
For bindings needing arguments, use explicit closures in the module provider's `register()`:

```php
public function register(): void
{
    $this->app->bind(PatientRepository::class, EloquentPatientRepository::class);

    // contextual binding: reporting controllers get a cached read repo
    $this->app->when(\App\Modules\Reporting\Services\PatientStatsService::class)
        ->needs(PatientRepository::class)
        ->give(\App\Modules\Patients\Repositories\Cached\CachedPatientRepository::class);
}
```

---

## 4. Service layer & transactions

**Rules:**

1. **Controllers are thin.** A controller method is `authorize → call service → return resource`.
2. **All business rules live in services** (or single-purpose Action classes for one-off
   operations such as `MergePatientsAction`). Services are stateless and constructor-injected.
3. **Transaction boundary = the service method.** Use `DB::transaction()` so the closure auto-
   rolls-back on exception. Never open transactions in controllers or repositories.
4. **Side-effects after commit.** Dispatch domain events *after* the transaction closure returns,
   or use `DB::afterCommit()` for listeners that must not run on rollback. Queued listeners are
   inherently safe because Laravel holds queued jobs until commit when `after_commit` is enabled.
5. **No nested transactions surprises.** Cross-service orchestration that must be atomic wraps the
   *outer* service method in one transaction; inner services detect they are already in a
   transaction (Laravel uses savepoints) and do not re-commit side-effects mid-flight.

```php
public function admitPatient(AdmitPatientData $data): Admission
{
    return DB::transaction(function () use ($data): Admission {
        $admission = $this->repository->create([...]);

        $this->bedService->reserve($data->bedId, $admission);   // same tx (savepoint)
        $this->billingService->openInpatientAccount($admission); // same tx

        DB::afterCommit(fn () => PatientAdmitted::dispatch($admission));

        return $admission;
    });
}
```

> **Idempotency at the service edge.** Operations triggered by external callbacks (M-Pesa, SHA)
> are made idempotent in the service by a uniqueness guard *before* mutation (see §6.4, §7.5).

---

## 5. DTO pattern (`spatie/laravel-data`)

DTOs are the **typed contract crossing every boundary**: HTTP→Service (request → DTO),
Service→Service (cross-module read models), and Service→Queue (job payloads, since `Data` objects
are serializable).

- **Construction:** `RegisterPatientData::from($request->validated())` or `::from($model)`.
- **Validation:** simple shape validation can live on the DTO via attributes, but Afya keeps the
  **authoritative validation in FormRequests** (foundation §2) so authorization + DB-aware rules
  (uniqueness scoped to branch) stay co-located. DTOs validate only when constructed outside HTTP
  (e.g. from a queue payload).
- **Mapping:** `#[MapInputName(SnakeCaseMapper::class)]` accepts snake_case API input into
  camelCase properties.
- **Collections / nesting:** nested DTOs (`NextOfKinData`) and `DataCollection` for arrays.

```php
<?php

namespace App\Modules\Patients\Data;

use Spatie\LaravelData\Data;

final class NextOfKinData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $phone,
        public readonly ?string $relationship = null,
    ) {
    }
}
```

```php
// Filter DTO carrying query params into the repository
final class PatientFilterData extends Data
{
    public function __construct(
        public readonly ?string $search = null,
        public readonly ?string $status = null,
        public readonly int $perPage = 25,
    ) {
    }
}
```

Output DTOs may be returned directly when no field hiding/HATEOAS is required, but **API responses
use Resources** (§2.8) so the JSON envelope and field exposure (UUID over BIGINT) stay centralized.

---

## 6. Events, Listeners, Queues

Domain side-effects are decoupled via events. Listeners that do I/O (SMS, email, PDF, external
HTTP) implement `ShouldQueue` and run on Redis-backed queues. This keeps the request fast and makes
side-effects retryable.

### 6.1 Queue topology (Redis)

| Connection | Queue | Workloads | Notes |
|---|---|---|---|
| `redis` | `alerts` | clinical-alert evaluation, triage escalation | **highest priority**, low latency |
| `redis` | `notifications` | SMS (AfricasTalking), email (Mailgun/Resend) | rate-limited, retry w/ backoff |
| `redis` | `claims` | SHA claim submission & status polling | external, slow, retry w/ backoff |
| `redis` | `pdf` | PDF generation (invoices, patient cards, lab reports) | CPU heavy, isolated worker |
| `redis` | `payments` | M-Pesa callback processing | idempotent, manual-review on fail |
| `redis` | `default` | misc background work, audit fan-out | never dropped; long retention |
| `redis` | `reporting` | report pre-aggregation / rollups | off-peak, scheduled |
| `redis` | `maintenance` | retention/archival sweeps | long-running, off-peak |

`php artisan queue:work redis --queue=alerts,notifications,claims,pdf,payments,default,reporting,maintenance`
runs with `--queue` priority order; `alerts`, `claims` and `payments` get dedicated supervised workers in prod.

### 6.2 Event registration

Laravel 11 auto-discovers listeners, but Afya declares them explicitly per module in
`EventServiceProvider` for traceability:

```php
protected $listen = [
    \App\Modules\Patients\Events\PatientRegistered::class => [
        \App\Modules\Patients\Listeners\SendPatientWelcomeSms::class,
        \App\Modules\Patients\Listeners\WritePatientAuditEntry::class,
        \App\Modules\Patients\Listeners\QueuePatientCardPdf::class,
    ],
    \App\Modules\EMR\Events\VitalsRecorded::class => [
        \App\Modules\ClinicalAlerts\Listeners\EvaluateClinicalAlerts::class,
    ],
    \App\Modules\Billing\Events\MpesaCallbackReceived::class => [
        \App\Modules\Billing\Listeners\ReconcileMpesaPayment::class,
    ],
];
```

### 6.3 Event + queued listener

```php
<?php

namespace App\Modules\Patients\Events;

use App\Modules\Patients\Models\Patient;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class PatientRegistered
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Patient $patient)
    {
    }
}
```

```php
<?php

namespace App\Modules\Patients\Listeners;

use App\Contracts\Notifications\NotificationChannelManager;
use App\Modules\Patients\Events\PatientRegistered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

final class SendPatientWelcomeSms implements ShouldQueue
{
    use InteractsWithQueue;

    public string $queue = 'notifications';
    public int $tries = 3;
    public array $backoff = [10, 60, 300];

    public function __construct(private readonly NotificationChannelManager $channels)
    {
    }

    public function handle(PatientRegistered $event): void
    {
        $this->channels->sms()->send(
            to: $event->patient->phone,
            message: "Welcome to Afya. Your patient number is {$event->patient->patient_number}.",
        );
    }

    public function failed(PatientRegistered $event, \Throwable $e): void
    {
        // route to failed_jobs + raise an ops alert; never lose the patient registration
        report($e);
    }
}
```

### 6.4 PDF generation job & M-Pesa callback

```php
<?php

namespace App\Modules\Documents\Jobs;

use App\Contracts\Storage\StorageManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class GenerateInvoicePdf implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public string $queue = 'pdf';

    public function __construct(public readonly string $invoicePublicId)
    {
    }

    public function handle(StorageManager $storage): void
    {
        $pdf  = app(\App\Modules\Billing\Services\InvoicePdfRenderer::class)
            ->render($this->invoicePublicId);

        $storage->disk()->put(
            "invoices/{$this->invoicePublicId}.pdf",
            $pdf,
        );
    }
}
```

M-Pesa callbacks arrive on a **signed webhook route**, are persisted raw, then an event drives an
**idempotent** reconciliation listener keyed on `CheckoutRequestID` / `mpesa_receipt`
(foundation §9):

```php
public function handle(MpesaCallbackReceived $event): void
{
    $payload = $event->payload;

    // idempotency guard — process each receipt exactly once
    if ($this->payments->alreadyReconciled($payload['CheckoutRequestID'])) {
        return;
    }

    DB::transaction(fn () => $this->payments->reconcile($payload));
}
```

---

## 7. Domain services

These are the shared, cross-module engines. They live in `app/Support`, `app/Domain`, or their
owning module, and are resolved via interfaces where multiple implementations exist.

### 7.1 `SequenceService` — gap-tolerant, concurrency-safe numbering

Backs every canonical identifier in foundation §3. The **only** writer of the `sequences` table.

```php
<?php

namespace App\Support\Sequences;

use Illuminate\Support\Facades\DB;

final class SequenceService
{
    /**
     * @param  callable(int):string  $format
     */
    public function next(string $scope, callable $format): string
    {
        return DB::transaction(function () use ($scope, $format): string {
            // SELECT ... FOR UPDATE → serialize concurrent allocators on this scope row
            $row = DB::table('sequences')
                ->where('scope', $scope)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                DB::table('sequences')->insert(['scope' => $scope, 'value' => 0]);
                $current = 0;
            } else {
                $current = (int) $row->value;
            }

            $next = $current + 1;

            DB::table('sequences')->where('scope', $scope)->update(['value' => $next]);

            return $format($next);
        });
    }
}
```

> Scopes mirror foundation §6: `patient:2026`, `invoice:NRB:2026`, `lab:NRB:260622`, etc. Branch
> and date components are baked into the scope string so each series increments independently.

### 7.2 `BranchScope` — global row-level tenancy

Implements foundation §4. Auto-filters every query by the request's active branch and stamps
`branch_id` on insert. Bypassed only for users with `branch.view-all`.

```php
<?php

namespace App\Support\Eloquent;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        if ($user === null || $user->can('branch.view-all')) {
            return; // unauthenticated console jobs & cross-branch admins are not constrained
        }

        $builder->where($model->getTable() . '.branch_id', $user->active_branch_id);
    }
}
```

```php
<?php

namespace App\Support\Concerns;

use App\Support\Eloquent\BranchScope;

trait HasBranchScope
{
    public static function bootHasBranchScope(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function ($model): void {
            if (empty($model->branch_id) && ($user = auth()->user())) {
                $model->branch_id = $user->active_branch_id;
            }
        });
    }
}
```

Console/queue contexts (where there is no `auth()->user()`) must set the branch explicitly or use
`Model::withoutGlobalScope(BranchScope::class)` for cross-branch reporting jobs.

### 7.3 `StorageManager` — driver abstraction (foundation §7)

```php
<?php

namespace App\Contracts\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;

interface StorageManager
{
    /** Returns the configured default disk (local|s3|r2|b2). */
    public function disk(?string $name = null): Filesystem;

    /** Time-limited signed URL for clinical files — no public buckets. */
    public function temporaryUrl(string $path, int $minutes = 5): string;
}
```

```php
final class FilesystemStorageManager implements StorageManager
{
    public function disk(?string $name = null): Filesystem
    {
        return Storage::disk($name ?? config('storage.default'));
    }

    public function temporaryUrl(string $path, int $minutes = 5): string
    {
        return $this->disk()->temporaryUrl($path, now()->addMinutes($minutes));
    }
}
```

### 7.4 `PaymentGateway` & `CashGateway` / `MpesaDarajaGateway` (foundation §9)

```php
<?php

namespace App\Contracts\Payments;

use App\Domain\ValueObjects\Money;

interface PaymentGateway
{
    public function charge(Money $amount, PaymentContext $context): PaymentResult;

    public function verifyCallback(array $payload): bool;
}
```

Bound in a `PaymentServiceProvider`; the active gateway is chosen per transaction (cash at the
cashier desk → `CashGateway`; mobile money → `MpesaDarajaGateway`). The Billing service depends on
the **interface**, never the concrete class.

### 7.5 `InsurerGateway` / `ShaGateway`

```php
interface InsurerGateway
{
    public function preAuthorize(PreAuthRequest $request): PreAuthResult;

    public function submitClaim(ClaimData $claim): ClaimResult;

    public function trackClaim(string $claimNumber): ClaimStatus;
}
```

`ShaGateway` implements Kenya's Social Health Authority flows; the abstraction lets a second
insurer be added without touching the Billing/Insurance services.

### 7.6 `NotificationChannelManager` (foundation §8)

```php
<?php

namespace App\Contracts\Notifications;

interface NotificationChannelManager
{
    public function sms(): SmsChannel;   // AfricasTalking impl

    public function email(): EmailChannel; // Mailgun | Resend per config
}
```

Channels wrap Laravel Notifications + custom transport classes; the provider is selected in
`config/notifications.php`. Application code never imports a provider SDK directly.

### 7.7 `ClinicalAlertEngine`

Evaluates recorded vitals/labs against rule sets (drug interactions, allergy conflicts, critical
ranges, MTS escalation). Runs on the `alerts` queue from a listener on `VitalsRecorded`,
`LabResultPosted`, `PrescriptionCreated`.

```php
<?php

namespace App\Modules\ClinicalAlerts\Services;

use App\Modules\ClinicalAlerts\Data\ClinicalContext;
use App\Modules\ClinicalAlerts\Events\ClinicalAlertRaised;

final class ClinicalAlertEngine
{
    /** @param iterable<\App\Modules\ClinicalAlerts\Contracts\AlertRule> $rules */
    public function __construct(private readonly iterable $rules)
    {
    }

    public function evaluate(ClinicalContext $context): void
    {
        foreach ($this->rules as $rule) {
            if ($rule->matches($context)) {
                ClinicalAlertRaised::dispatch($rule->toAlert($context));
            }
        }
    }
}
```

Rules are registered as a tagged collection in the container — adding a new rule is "create the
class, tag it" (Open/Closed; see §12.2). Raised alerts broadcast in real time to the relevant
clinician's channel (§11.3) and persist for the EMR timeline.

---

## 8. Spatie Permission + Activity Log

### 8.1 Permission model

- Roles & permissions per foundation §5; permission names `{module}.{action}`.
- `User` uses `Spatie\Permission\Traits\HasRoles`.
- **Permissions are global reference data** (no `branch_id` per foundation §4); **scope** is added
  by the `BranchScope` + the policy's `canAccessBranch()` check, so the same `doctor` role at NRB
  cannot read MSA patients even though the permission name is identical.
- Authorization is checked in **Policies** (`$user->can('patients.update')`) invoked from
  FormRequest `authorize()` and controller `$this->authorize()`. Gates are reserved for non-model
  abilities (`branch.view-all`).
- Permission lookups are cached by Spatie in Redis; cache busted on role/permission change.

```php
// app/Models/User.php (excerpt)
use Spatie\Permission\Traits\HasRoles;

final class User extends Authenticatable
{
    use HasRoles;

    public function canAccessBranch(int $branchId): bool
    {
        return $this->can('branch.view-all')
            || $this->branches->contains('id', $branchId);
    }
}
```

### 8.2 Activity Log vs. immutable audit (foundation §11)

Two complementary mechanisms:

1. **Spatie Activity Log** — automatic model-change history (who changed which fields on which
   model). Enabled per model via `LogsActivity` (§2.7). Used for the EMR/admin "history" tabs.
2. **Dedicated immutable `audit_logs`** — security & PHI-access events (login, MFA, record *views*,
   exports, permission grants). Written via a dedicated `AuditService` on the `default` queue,
   append-only (no update/delete grants on the table for the app DB user), with hash-chaining for
   tamper evidence.

```php
$this->audit->record(
    action: 'patient.viewed',
    subject: $patient,
    actor: $request->user(),
    context: ['ip' => $request->ip(), 'branch_id' => $request->user()->active_branch_id],
);
```

---

## 9. Validation strategy

1. **FormRequest is the single validation surface** for all write endpoints. No `$request->
   validate()` in controllers, no validation in services for HTTP-originated data.
2. **Authorization in `authorize()`**, delegating to Policies/Gates — a 403 is raised before rules
   run.
3. **DB-aware & branch-scoped rules** (uniqueness within branch) live in the FormRequest because
   they need the authenticated user's `active_branch_id`.
4. **Custom Rule objects** for domain invariants reused across modules (e.g. `KenyanMsisdn`,
   `ValidShaNumber`, `WithinPharmacyStock`).
5. **DTO validation** is a *second line* used only when a `Data` object is constructed outside
   HTTP (queue payloads, imports). It never replaces the FormRequest.
6. **Frontend Zod mirrors** the FormRequest (foundation §10) but the backend is authoritative.
7. **Enum validation** via `new Enum(TriageLevel::class)` so only canonical MTS values pass.

```php
final class KenyanMsisdn implements \Illuminate\Contracts\Validation\ValidationRule
{
    public function validate(string $attribute, mixed $value, \Closure $fail): void
    {
        if (! preg_match('/^\+?254\d{9}$/', (string) $value)) {
            $fail('The :attribute must be a valid Kenyan phone number.');
        }
    }
}
```

---

## 10. Error handling & exception rendering

The API returns a **consistent JSON envelope** for every error. The base `DomainException`
carries an HTTP status + machine code; the `Handler` renders it.

```php
<?php

namespace App\Exceptions;

abstract class DomainException extends \Exception
{
    public function status(): int
    {
        return 422;
    }

    abstract public function errorCode(): string; // e.g. "patient.duplicate_national_id"
}
```

```php
// app/Exceptions/Handler.php (register())
$this->renderable(function (DomainException $e, $request) {
    return response()->json([
        'error' => [
            'code'    => $e->errorCode(),
            'message' => $e->getMessage(),
        ],
    ], $e->status());
});

$this->renderable(function (ValidationException $e, $request) {
    return response()->json([
        'error' => [
            'code'    => 'validation_failed',
            'message' => 'The given data was invalid.',
            'fields'  => $e->errors(),
        ],
    ], 422);
});

$this->renderable(function (AuthorizationException|AccessDeniedHttpException $e, $request) {
    return response()->json([
        'error' => ['code' => 'forbidden', 'message' => 'You are not authorized for this action.'],
    ], 403);
});

$this->renderable(function (ModelNotFoundException|NotFoundHttpException $e, $request) {
    return response()->json([
        'error' => ['code' => 'not_found', 'message' => 'Resource not found.'],
    ], 404);
});
```

- All API requests are forced to JSON (`ForceJsonResponse` middleware) so HTML error pages never
  leak.
- `report()` ships unexpected throwables to the log/monitoring channel; PHI is **never** logged
  in exception context (a `dontFlash`/scrubber strips `national_id`, `sha_number`, vitals).
- Domain exceptions per module live in `app/Modules/{Module}/Exceptions` and extend
  `DomainException` (e.g. `InsufficientStockException` returns 409 `pharmacy.insufficient_stock`).

---

## 11. Caching, scheduler, broadcasting

### 11.1 Caching (Redis)

| Use | Key shape | TTL / invalidation |
|---|---|---|
| Permission/role resolution | Spatie internal | event-busted on change |
| Reference data (ICD-10, drug catalog, branches) | `ref:icd10`, `ref:drugs:v{n}` | 24h + version bump |
| Dashboard aggregates | `dash:{branch}:{metric}:{date}` | 5–15 min |
| Heavy reports | tagged `reports` | busted by domain events |
| Rate-limit counters / queue board state | `throttle:*`, `queue:{branch}:{station}` | short / live |

- Use **cache tags** (`Cache::tags(['patients', "branch:{$id}"])`) so a `PatientUpdated` listener
  flushes only the affected slice.
- Cache is **read-through** in cached repositories (§3.3), never sprinkled in controllers.

### 11.2 Scheduler (`app/Console/Kernel.php`)

Modules expose schedule registrars; the kernel composes them.

```php
protected function schedule(Schedule $schedule): void
{
    // daily queue-ticket reset (DEPT-NNN resets per day, foundation §3)
    $schedule->command('queue:reset-tickets')->dailyAt('00:01')->timezone('Africa/Nairobi');

    // SHA claim status polling
    $schedule->job(new \App\Modules\Insurance\Jobs\PollClaimStatuses)->everyThirtyMinutes();

    // appointment reminders (T-24h SMS)
    $schedule->job(new \App\Modules\Appointments\Jobs\SendDueReminders)->hourly();

    // inventory reorder-level scan → low-stock alerts
    $schedule->command('inventory:scan-reorder')->dailyAt('06:00');

    // nightly clinical-document archival (retention ≥10y, foundation §11)
    $schedule->command('documents:archive')->dailyAt('02:00');

    // overdue inpatient billing accrual
    $schedule->command('billing:accrue-inpatient')->dailyAt('01:00');

    $schedule->command('horizon:snapshot')->everyFiveMinutes();
}
```

All schedules run via a single `php artisan schedule:run` cron entry; long jobs are dispatched to
queues (never run inline in the scheduler tick). `withoutOverlapping()` and `onOneServer()` guard
multi-instance deployments.

### 11.3 Broadcasting (Laravel Reverb + Redis)

Realtime for the queue board, clinical alerts, and notifications (foundation §13).

- **Driver:** Laravel Reverb (first-party WebSocket server), Redis as the broadcast backplane.
- **Private/presence channels**, authorized in `routes/channels.php` against permissions + branch.

```php
// routes/channels.php
Broadcast::channel('branch.{branchId}.queue', function ($user, int $branchId) {
    return $user->canAccessBranch($branchId) && $user->can('queue.view');
});

Broadcast::channel('clinician.{userId}.alerts', function ($user, int $userId) {
    return $user->id === $userId; // private alert stream per clinician
});
```

```php
final class QueueTicketCalled implements ShouldBroadcast
{
    public function __construct(public readonly QueueTicketData $ticket) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("branch.{$this->ticket->branchId}.queue")];
    }
}
```

`ClinicalAlertRaised` (§7.7) broadcasts on the clinician's private channel for immediate UI
notification; the same event also persists and (if unacknowledged) escalates via the scheduler.

---

## 12. Coding standards & SOLID

### 12.1 Standards

- **PSR-12**, enforced by **Laravel Pint** (`pint --test` in CI, auto-fix in Husky pre-commit per
  foundation §14).
- **PHPStan / Larastan at max level** on `app/` — no `mixed` leaks, typed properties everywhere.
- `declare(strict_types=1);` at the top of every PHP file. Classes `final` by default; open for
  extension only when designed for it.
- Naming: classes `PascalCase`, methods `camelCase`, DB tables `snake_case` plural (foundation §14).
- Constructor property promotion + readonly for DTOs/services. No facades inside services where an
  injected dependency is clearer (facades allowed in framework-edge code).
- Conventional Commits; CI gates: Pint, PHPStan, Pest (≥80% coverage), `pest-arch` boundary tests.

```php
// pest-arch boundary test — enforces module isolation (§1.1)
test('modules do not reach into another module\'s repositories')
    ->expect('App\Modules')
    ->not->toUse('App\Modules\*\Repositories\Eloquent');
```

### 12.2 SOLID in practice

- **S — Single Responsibility:** Controller routes, FormRequest validates, Service orchestrates,
  Repository persists, Resource shapes. `SequenceService` does numbering and nothing else.
- **O — Open/Closed:** `ClinicalAlertEngine` iterates tagged `AlertRule` implementations; adding a
  rule needs no engine change. New payment providers add a `PaymentGateway` impl + binding.
- **L — Liskov:** `CashGateway` and `MpesaDarajaGateway` are fully substitutable behind
  `PaymentGateway`; `EloquentPatientRepository` and `CachedPatientRepository` behind
  `PatientRepository`. No impl strengthens preconditions or weakens postconditions.
- **I — Interface Segregation:** `NotificationChannelManager` exposes `sms()`/`email()` separately;
  the `InsurerGateway` is split from `PaymentGateway` rather than a fat "Gateway" interface.
- **D — Dependency Inversion:** Services depend on repository/gateway/manager **interfaces** bound
  in providers; high-level business logic never news-up infrastructure.

```php
// DIP + OCP: engine depends on an abstraction; rules are injected as a tagged collection
$this->app->tag([
    DrugInteractionRule::class,
    AllergyConflictRule::class,
    CriticalVitalsRule::class,
    TriageEscalationRule::class,
], 'clinical.rules');

$this->app->bind(ClinicalAlertEngine::class, fn ($app) =>
    new ClinicalAlertEngine($app->tagged('clinical.rules')));
```

---

## 13. Summary — the contract every module obeys

1. One folder under `app/Modules/{Module}`, identical internal shape, self-registering provider.
2. Route → Controller (thin) → FormRequest (validate + authorize → DTO) → Service (transaction,
   business rules, events) → Repository (interface) → Model (BranchScope) → Resource (JSON).
3. Cross-module access only via published Services/Events; infrastructure only via Contracts.
4. Side-effects are queued events; identifiers come from `SequenceService`; tenancy is enforced by
   `BranchScope`; abstractions (storage, payments, insurer, notifications) are always
   interface-first.
5. RBAC via Spatie Permission in Policies; history via Activity Log; security via immutable audit.
6. PSR-12 + Pint + PHPStan + Pest, SOLID, ≥80% coverage, architecture tests enforce boundaries.

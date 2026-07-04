# Afya HMS — Branch Isolation Security Fix

> **Document:** `23-branch-isolation-security-fix.md`
> **System:** Afya HMS — Laravel 11 + React/Vite
> **Status:** ACTIVE SECURITY PATCH — Ships Before All Feature Work
> **Severity:** Critical
> **Depends on:** `21-profile-editing-fix-plan.md`
> **Blocks:** All of Doc 21 Steps 2–7, All of Doc 22

---

## What This Document Is

This is not a feature document. This is a security patch document.

The vulnerability confirmed in the preceding investigation is a complete
branch isolation bypass on the `Patient` model. Any authenticated user
holding `patients.update` can read and write any patient record in the
entire system regardless of branch. There is no scope filtering reads.
There is no policy check on writes. The branches exist in the database
but provide zero access control at runtime.

This document specifies exactly three fixes, in exact order, with exact
verification tests. Nothing else gets built until all three pass.

---

## Confirmed Vulnerability Summary

### What Was Found

| Layer | Expected | Actual | Status |
|---|---|---|---|
| `BranchContext` source | Database-sourced, unspoofable | Sanctum token → `current_branch_id` → `home_branch_id` | ✅ Clean |
| `HasBranch` global scope | Filters all Patient reads by branch | Only stamps `branch_id` on create — no read filter | ❌ Missing |
| Policy call on writes | `$this->authorize('manage', $patient)` in update path | Not called — guarded by permission only | ❌ Missing |
| Cross-branch fetch | Returns 404 for out-of-branch UUID | Returns the patient — any branch, any admin | ❌ Bypassed |

### The Exact Attack Path

```
Branch A Hospital Admin
        ↓
PATCH /api/patients/{branch-B-patient-uuid}
        ↓
findByPublicId() → Patient::query()->where('public_id', $uuid)->first()
No branch filter on query. Patient found.
        ↓
UpdatePatientRequest → validates field types only, not ownership
        ↓
PatientService::update() → writes to database
        ↓
200 OK. Branch B patient record silently overwritten.
No policy check. No audit flag. No error.
```

### Scope of the Damage

Every `PatientController` method that receives a `{uuid}` is exposed:
- `show()` — information leakage across branches
- `update()` — confirmed write bypass
- `destroy()` / `deactivate()` — cross-branch deactivation possible
- Any other UUID-parameterised method

---

## Fix A — Add BranchScope as a Global Scope on the Patient Model

### What This Fixes

Every `Patient::query()` call anywhere in the codebase will automatically
append `WHERE branch_id = {active_branch_id}`. A Branch A admin hitting a
Branch B patient UUID receives `404 Model Not Found` — the record is
invisible to them before any controller logic runs. This is defense at the
data layer, not the controller layer.

### Implementation

**File:** `backend/app/Modules/Patients/Models/Patient.php`

Add a `booted()` method registering `BranchScope` as a global scope:

```php
protected static function booted(): void
{
    static::addGlobalScope(new BranchScope());
}
```

Ensure `BranchScope` is imported at the top of the model. The class already
exists and is used by other models — do not create a new one.

### What BranchScope::apply() Must Do

Before you register it, read the existing `BranchScope::apply()` method and
confirm it contains a Superadmin exemption. It must look structurally like this:

```php
public function apply(Builder $builder, Model $model): void
{
    $user = Auth::user();

    // Superadmin sees everything — no branch filter applied
    if ($user && $user->hasRole('superadmin')) {
        return;
    }

    $activeBranchId = app(BranchContext::class)->get();

    if ($activeBranchId) {
        $builder->where($model->getTable() . '.branch_id', $activeBranchId);
    }
}
```

**If the Superadmin exemption does not exist in the current `BranchScope`,
add it before registering the scope on Patient.** Registering a scope
without the exemption will make all patient records invisible to Superadmin —
your highest privilege account becomes blind. That is worse than the current
vulnerability.

Also confirm `BranchScope::apply()` handles the case where `$activeBranchId`
is null — a request where `BranchContext` was never set should not silently
return all patients. It should return nothing (`$builder->whereNull('id')` or
equivalent) if no active branch can be resolved.

### Critical Audit After Adding the Scope

After adding the global scope, `Patient::query()` is now branch-filtered
everywhere. You must find every legitimate cross-branch patient fetch and
add `withoutGlobalScope(BranchScope::class)` explicitly.

**Search the codebase for all patient query locations. The ones that likely
need `withoutGlobalScope()`:**

```
- Superadmin system reports (if any run cross-branch patient aggregations)
- Inter-branch referral workflows (patient referred from Branch A to Branch B)
- PatientService methods used by Superadmin-only features
- Any seeder or test factory that creates patients and then fetches them
  before BranchContext is set
- Any artisan command that processes patients across all branches
```

**How to find them:**
```bash
grep -rn "Patient::" backend/app --include="*.php" | grep -v "::class"
grep -rn "patients()" backend/app --include="*.php"
grep -rn "PatientRepository\|EloquentPatientRepository" backend/app --include="*.php"
grep -rn "->patients->" backend/app --include="*.php"
```

Review every result. For each one, ask: does this legitimately need
cross-branch access? If yes, add `withoutGlobalScope(BranchScope::class)`.
If no, the new scope protects it correctly — leave it.

**Every added `withoutGlobalScope()` call must have a comment explaining
why cross-branch access is required at that specific location.** This is
not optional. Future developers must not treat it as a template to copy.

---

## Fix B — Add Policy Authorization to All UUID-Receiving PatientController Methods

### What This Fixes

Even with the global scope in place, the policy call is the second
independent door. If the scope is ever removed or bypassed for a legitimate
reason, the policy call is the last line of defense on write operations.
Defense in depth means two independent checks, not one.

### Implementation

**File:** `backend/app/Modules/Patients/Controllers/PatientController.php`

Add `$this->authorize('manage', $patient)` as the **first line of logic**
in every method that receives a patient model instance. It must run before
validation, before service calls, before anything.

```php
public function show(Request $request, Patient $patient): JsonResponse
{
    $this->authorize('manage', $patient);
    // existing logic
}

public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
{
    $this->authorize('manage', $patient);
    // existing logic
}

public function deactivate(Request $request, Patient $patient): JsonResponse
{
    $this->authorize('manage', $patient);
    // existing logic
}

// Apply to every other method receiving Patient $patient
```

### Verify PatientPolicy::manage() Is Correct

Before trusting the policy call, read `PatientPolicy::manage()` and confirm
it does exactly two things and nothing else:

1. Gets `$activeBranchId` from `BranchContext`
2. Returns `$patient->branch_id === $activeBranchId` — or `true` for Superadmin

If it does anything more complex — joins, service calls, caching — stress-test
it. Policies are called on every authorized request. A slow policy is a
performance attack surface.

If it does anything less — for example, it only checks role without checking
branch — the policy call protects against unauthorized roles but not
against cross-branch access from authorized roles.

### Why the Policy Call Stays Even After Fix A

```
Scenario: A future developer adds withoutGlobalScope(BranchScope::class)
to findByPublicId() for a valid reporting reason and forgets to revert it.

Without Fix B: Branch isolation is silently gone on all write paths.
With Fix B:    Policy call catches it. Cross-branch write gets 403.
               The developer notices. The scope omission gets fixed.
```

Fix A protects against accidental omission at the query level.
Fix B protects against accidental omission at the authorization level.
Neither is redundant. Both are required.

---

## Fix C — Audit All Other Models for the Same Missing Scope

### What This Fixes

The investigation found that `Patient` is the only model using `HasBranch`
without registering `BranchScope`. But "the only one" must be verified,
not assumed. If `Appointment`, `Prescription`, `LabResult`, `Invoice`,
or any other branch-scoped model has the same gap, those models have the
same bypass.

### How to Audit

**Step 1 — Find all models using HasBranch:**

```bash
grep -rn "use HasBranch" backend/app --include="*.php"
```

**Step 2 — For each model found, check if BranchScope is registered:**

```bash
grep -rn "addGlobalScope.*BranchScope\|BranchScope" backend/app/Modules --include="*.php"
```

**Step 3 — Cross-reference.** Every model from Step 1 must appear in Step 2's results.
Any model in Step 1 that is NOT in Step 2 has the same vulnerability as `Patient` did.

**Step 4 — For each gap found, apply Fix A's pattern.** Register `BranchScope`
in the model's `booted()` method. Repeat Fix A's cross-branch fetch audit
for that model's query locations.

**Step 5 — Also check models that do NOT use HasBranch but have a `branch_id` column.**

```bash
grep -rn "branch_id" backend/database/migrations --include="*.php" | grep "->integer\|->unsignedBigInteger\|->foreignId"
```

Any migration adding `branch_id` to a table means that model should probably
be branch-scoped. If it is not, it is either intentionally global (system
tables) or accidentally unscoped (a vulnerability). Determine which for each.

---

## The Three Verification Tests — All Must Pass

Do not close this document as complete until all three pass.
Run them in order. A failure in Test 1 means Fix A did not land.
A failure in Test 2 means Fix B did not land. A failure in Test 3
means you broke Superadmin access while fixing the bypass.

---

### Test 1 — Global Scope Blocks Cross-Branch Fetch

**Setup:**
- User A: Hospital Admin assigned to Branch A (logged in, token obtained)
- Patient X: Registered under Branch B (UUID known)

**Action:**
```
GET /api/patients/{Patient-X-uuid}
Authorization: Bearer {Branch-A-Admin-token}
```

**Expected:** `404 Not Found`

**If you get `200`:** The global scope is not registered on the Patient model.
Verify `booted()` exists, verify `BranchScope` is imported, verify
`BranchContext::get()` is returning a non-null value during the request.

**If you get `403`:** The global scope is not working but the policy call
landed first. The patient was fetched (scope not applied) but the policy
blocked the response. Fix A is incomplete — the scope must cause a 404,
not the policy causing a 403.

---

### Test 2 — Policy Blocks If Scope Is Bypassed

**Purpose:** Verify Fix B independently of Fix A.

**Setup:** Temporarily modify `findByPublicId()` in
`EloquentPatientRepository` to add `withoutGlobalScope(BranchScope::class)`:

```php
// TEMPORARY TEST ONLY — REVERT AFTER TEST
return $this->newQuery()
    ->withoutGlobalScope(BranchScope::class)
    ->where('public_id', $publicId)
    ->first();
```

**Action:**
```
PATCH /api/patients/{Branch-B-patient-uuid}
Authorization: Bearer {Branch-A-Admin-token}
Body: { "first_name": "Test" }
```

**Expected:** `403 Forbidden`

**If you get `200`:** The policy call is missing or not firing correctly.
Verify `$this->authorize('manage', $patient)` is in `PatientController::update()`.
Verify `PatientPolicy::manage()` is registered in `AuthServiceProvider`.

**After the test:** Revert the `withoutGlobalScope()` change immediately.
Commit the revert separately so the test modification never ships.

---

### Test 3 — Superadmin Retains Full Cross-Branch Access

**Setup:**
- Superadmin user (logged in, token obtained)
- Patient Y: Registered under any branch

**Action:**
```
GET /api/patients/{Patient-Y-uuid}
Authorization: Bearer {Superadmin-token}
```

**Expected:** `200 OK` with full patient data

**If you get `404`:** `BranchScope::apply()` is missing the Superadmin
exemption. Add it. A Superadmin that cannot see patients across branches
cannot perform system administration. This is a critical regression.

**If you get `403`:** `PatientPolicy::manage()` is not returning `true`
for Superadmin. Fix the policy's role check.

---

## Regression Checks After All Three Fixes Land

Beyond the three verification tests, run your existing test suite if one
exists. If it does not exist, manually verify these workflows are intact:

- Branch A Hospital Admin can still view, create, and update Branch A patients ✓
- Branch A Hospital Admin cannot view or update Branch B patients ✓
- Receptionist at Branch A can register a new patient (branch stamped correctly on create) ✓
- Doctor at Branch A can view their branch's patients ✓
- Superadmin can view patients from any branch ✓
- Patient portal: A patient can view only their own record ✓

---

## Commit Strategy

These three fixes must ship as focused, reviewable commits — not buried
inside a feature branch.

```
Commit 1: fix(patient): register BranchScope global scope on Patient model
           — Fix A only
           — Include the withoutGlobalScope() additions for legitimate cross-branch calls

Commit 2: fix(patient): authorize manage policy on all PatientController UUID methods
           — Fix B only
           — One line per method, nothing else

Commit 3: fix(branch): audit and patch remaining models missing BranchScope registration
           — Fix C only
           — One commit per additional model found with the gap

Commit 4: test(branch): verify branch isolation across all three fix layers
           — Test results documented, all three tests passing confirmed
```

**Do not combine these into one commit.** If Fix A causes a regression,
you need to be able to revert it cleanly without reverting Fix B.
Atomic commits are not a preference here — they are how you stay in control
of a security patch.

---

## What Happens If You Skip This and Go to Doc 21 / Doc 22

You will build profile editing features on top of a system where any
Hospital Admin can read and write any patient across any branch.

That means:
- The self-edit UI you build will coexist with an unguarded admin edit path
- Every audit log entry you implement will be accurate for the edit it
  records but will never flag the branch violation because the system
  does not know one occurred
- When you add more patient-linked features (appointments, prescriptions,
  billing) those controllers will likely copy the same pattern from
  `PatientController` — inheriting the bypass into every new module
- The longer this stays unfixed, the more surface area the bypass covers

**Fix this now. Everything else waits.**

---

*This document is part of the Afya HMS canonical decisions series.*
*This is a security patch document. It does not require team alignment to ship.*
*It requires correct implementation and passing tests.*
*Closing this document as complete requires all three tests passing and*
*all three commits merged. Nothing less.*

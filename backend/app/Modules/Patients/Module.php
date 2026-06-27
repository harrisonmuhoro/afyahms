<?php

declare(strict_types=1);

namespace App\Modules\Patients;

/**
 * Per foundation §1 + 04-functional-requirements §FR-PAT-001..016 — Patients
 * is the root clinical aggregate. Every downstream module (EMR, Triage,
 * Pharmacy, Laboratory, Radiology, Billing, Insurance, Inpatient, PatientPortal)
 * depends on `Patients\Models\Patient` and its public_id.
 *
 * This module is itself branch-scoped via the global BranchScope — every
 * operational query MUST filter by the user's active branch unless the
 * caller has `branch.view-all`.
 *
 * Module only owns:
 *   - Patients\Models\Patient (+ PatientNextOfKin, PatientRelationship,
 *     PatientInsurance, Allergy)
 *   - Patients\Repositories\* (interfaces + Eloquent impls)
 *   - Patients\Services\* (registration, search, dedupe, merge)
 *   - Patients\Controllers\*
 *   - Patients\Requests\* (FormRequests)
 *   - Patients\Resources\* (JSON shaping)
 *
 * Other modules MUST NOT mutate patient rows directly — they reach for the
 * service layer or read the model only.
 */
final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void
    {
        $app->bind(
            \App\Modules\Patients\Repositories\Contracts\PatientRepository::class,
            \App\Modules\Patients\Repositories\Eloquent\EloquentPatientRepository::class,
        );

        $app->bind(
            \App\Modules\Patients\Repositories\Contracts\NextOfKinRepository::class,
            \App\Modules\Patients\Repositories\Eloquent\EloquentNextOfKinRepository::class,
        );

        $app->bind(
            \App\Modules\Patients\Repositories\Contracts\PatientInsuranceRepository::class,
            \App\Modules\Patients\Repositories\Eloquent\EloquentPatientInsuranceRepository::class,
        );

        $app->bind(
            \App\Modules\Patients\Repositories\Contracts\AllergyRepository::class,
            \App\Modules\Patients\Repositories\Eloquent\EloquentAllergyRepository::class,
        );
    }

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        // Patient-level observables (audit trail, branch scoping) are wired
        // on the model via the HasAuditTrail + HasBranch traits — no global
        // boot work needed here.
    }
}
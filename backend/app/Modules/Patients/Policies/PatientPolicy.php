<?php

declare(strict_types=1);

namespace App\Modules\Patients\Policies;

use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Modules\Tenancy\Services\BranchContext;
use Illuminate\Auth\Access\HandlesAuthorization;

class PatientPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return app(BranchContext::class)->get() !== null && $user->can('patients.read');
    }

    public function update(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return app(BranchContext::class)->get() !== null && $user->can('patients.update');
    }

    public function merge(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return app(BranchContext::class)->get() !== null && $user->can('patients.merge');
    }

    public function create(User $user): bool
    {
        return $user->can('patients.create');
    }

    public function delete(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Only the registering branch or superadmins can soft-delete a patient.
        $activeBranch = app(BranchContext::class)->get();

        return $activeBranch !== null
            && (int) $patient->branch_id === (int) $activeBranch
            && $user->can('patients.delete');
    }
}

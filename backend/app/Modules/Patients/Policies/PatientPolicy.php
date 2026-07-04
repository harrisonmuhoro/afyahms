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

    public function manage(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $activeBranch = app(BranchContext::class)->get();

        return $activeBranch !== null && (int) $patient->branch_id === (int) $activeBranch;
    }

    public function view(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $activeBranch = app(BranchContext::class)->get();

        return $activeBranch !== null
            && (int) $patient->branch_id === (int) $activeBranch
            && $user->can('patients.read');
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

        $activeBranch = app(BranchContext::class)->get();

        return $activeBranch !== null
            && (int) $patient->branch_id === (int) $activeBranch
            && $user->can('patients.delete');
    }
}

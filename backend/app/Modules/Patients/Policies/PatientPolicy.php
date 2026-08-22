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

    /**
     * Roles explicitly allowed to edit patient demographic data.
     * All other roles (doctor, nurse, pharmacist, cashier, etc.) are denied
     * regardless of any permission granted to them.
     */
    private const EDIT_ALLOWED_ROLES = [
        'superadmin',
        'hospital-admin',
        'receptionist',
        'records-officer',
    ];

    public function view(User $user, Patient $patient): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return app(BranchContext::class)->get() !== null && $user->can('patients.read');
    }

    public function update(User $user, Patient $patient): bool
    {
        // Strict role whitelist — permission alone is NOT sufficient.
        // Even if a role has patients.update permission, they must also be
        // in the allowed roles list below. This prevents doctors/nurses/
        // cashiers from ever editing patient demographics.
        foreach (self::EDIT_ALLOWED_ROLES as $role) {
            if ($user->hasRole($role)) {
                // superadmin bypasses branch context check
                if ($role === 'superadmin') {
                    return true;
                }
                return app(BranchContext::class)->get() !== null
                    && $user->can('patients.update');
            }
        }

        // Any role not in the whitelist is unconditionally denied.
        return false;
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

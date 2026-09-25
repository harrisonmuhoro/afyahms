<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Policies;

use App\Models\User;
use App\Modules\Appointments\Models\Appointment;
use Illuminate\Auth\Access\HandlesAuthorization;

class AppointmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('appointments.list');
    }

    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->hasRole('patient')) {
            return (int) $user->patient?->id === (int) $appointment->patient_id;
        }

        if (! $user->hasPermissionTo('appointments.read') || ! $this->branchAllowed($user, $appointment->branch_id)) {
            return false;
        }

        return ! $user->hasRole('doctor') || (int) $user->id === (int) $appointment->doctor_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('appointments.create');
    }

    public function update(User $user, Appointment $appointment): bool
    {
        if (! $user->hasPermissionTo('appointments.update') || ! $this->branchAllowed($user, $appointment->branch_id)) {
            return false;
        }

        return ! $user->hasRole('doctor') || (int) $user->id === (int) $appointment->doctor_id;
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        return $user->hasPermissionTo('appointments.delete')
            && $this->branchAllowed($user, $appointment->branch_id);
    }

    private function branchAllowed(User $user, int|string $branchId): bool
    {
        if ($user->hasRole('superadmin') || $user->can('branch.view-all')) {
            return true;
        }

        return in_array((int) $branchId, array_map('intval', $user->accessibleBranchIds()), true);
    }
}

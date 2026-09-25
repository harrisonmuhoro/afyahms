<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Policies;

use App\Models\User;
use App\Modules\Appointments\Models\DoctorSchedule;
use Illuminate\Auth\Access\HandlesAuthorization;

class DoctorSchedulePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('appointments.list');
    }

    public function view(User $user, DoctorSchedule $schedule): bool
    {
        if (! $this->branchAllowed($user, $schedule->branch_id)) {
            return false;
        }

        if ($user->hasRole('superadmin') || $user->hasRole('hospital-admin') || $user->hasRole('receptionist') || $user->hasRole('cashier')) {
            return true;
        }
        
        return (int)$user->id === (int)$schedule->doctor_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('appointments.create');
    }

    public function update(User $user, DoctorSchedule $schedule): bool
    {
        if (! $this->branchAllowed($user, $schedule->branch_id)) {
            return false;
        }

        if ($user->hasRole('superadmin') || $user->hasRole('hospital-admin') || $user->hasRole('receptionist')) {
            return true;
        }
        
        if ($user->hasRole('doctor')) {
            return (int)$user->id === (int)$schedule->doctor_id;
        }

        return false;
    }

    public function delete(User $user, DoctorSchedule $schedule): bool
    {
        return ($user->hasRole('superadmin') || $user->hasRole('hospital-admin'))
            && $this->branchAllowed($user, $schedule->branch_id);
    }

    private function branchAllowed(User $user, int|string $branchId): bool
    {
        if ($user->hasRole('superadmin') || $user->can('branch.view-all')) {
            return true;
        }

        return in_array((int) $branchId, array_map('intval', $user->accessibleBranchIds()), true);
    }
}

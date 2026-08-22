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
        return $user->hasRole('superadmin') 
            || $user->hasRole('hospital-admin') 
            || $user->hasRole('doctor') 
            || $user->hasRole('receptionist');
    }

    public function view(User $user, DoctorSchedule $schedule): bool
    {
        if ($user->hasRole('superadmin') || $user->hasRole('hospital-admin') || $user->hasRole('receptionist')) {
            return true;
        }
        
        return (int)$user->id === (int)$schedule->doctor_id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('superadmin') 
            || $user->hasRole('hospital-admin') 
            || $user->hasRole('doctor');
    }

    public function update(User $user, DoctorSchedule $schedule): bool
    {
        if ($user->hasRole('superadmin') || $user->hasRole('hospital-admin')) {
            return true;
        }
        
        if ($user->hasRole('doctor')) {
            return (int)$user->id === (int)$schedule->doctor_id;
        }

        return false;
    }

    public function delete(User $user, DoctorSchedule $schedule): bool
    {
        return $user->hasRole('superadmin') || $user->hasRole('hospital-admin');
    }
}

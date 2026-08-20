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
        return $user->hasPermissionTo('view_appointments');
    }

    public function view(User $user, Appointment $appointment): bool
    {
        return $user->hasPermissionTo('view_appointments');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_appointments');
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $user->hasPermissionTo('edit_appointments');
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        return $user->hasPermissionTo('delete_appointments');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Modules\Appointments\Models\Appointment;
use App\Notifications\AppointmentBookedNotification;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AppointmentService
{
    public function createAppointment(array $data): Appointment
    {
        return DB::transaction(function () use ($data) {
            $appointment = Appointment::create($data);

            if ($appointment->doctor_id) {
                $doctor = User::find($appointment->doctor_id);
                if ($doctor) {
                    $doctor->notify(new AppointmentBookedNotification($appointment));
                }
            }

            return $appointment;
        });
    }

    public function cancelAppointment(Appointment $appointment): bool
    {
        return $appointment->update(['status' => 'cancelled']);
    }
}

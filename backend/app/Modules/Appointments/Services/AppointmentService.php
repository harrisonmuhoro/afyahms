<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Exceptions\SlotUnavailableException;
use App\Modules\Appointments\Enums\AppointmentStatus;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Models\DoctorSchedule;
use Illuminate\Support\Facades\DB;

class AppointmentService
{
    public function __construct(
        private readonly AppointmentNumberService $numberService
    ) {}

    public function book(array $data): Appointment
    {
        return DB::transaction(function () use ($data) {
            // 1. Lock the schedule row
            $schedule = DoctorSchedule::lockForUpdate()->findOrFail($data['schedule_id']);

            // 2. Validate slot is available
            $this->checkConflict(
                $schedule,
                $data['doctor_id'],
                $data['appointment_date'],
                $data['start_time'],
                $data['end_time']
            );

            // 3. Create appointment
            $appointment = Appointment::create([
                ...$data,
                'appointment_number' => $this->numberService->generate((string) $data['branch_id']),
                'booked_by' => auth()->id(),
                'status' => AppointmentStatus::Scheduled,
            ]);

            // Note: AppointmentObserver handles triggering Reminder jobs
            return $appointment;
        });
    }

    public function reschedule(Appointment $appointment, array $newData): Appointment
    {
        return DB::transaction(function () use ($appointment, $newData) {
            $appointment->update([
                'status' => AppointmentStatus::Rescheduled,
            ]);

            $newAppointment = $this->book([
                ...$appointment->only(['patient_id', 'branch_id', 'type', 'reason', 'chief_complaint', 'notes', 'booked_via']),
                'doctor_id' => $newData['doctor_id'] ?? $appointment->doctor_id,
                'schedule_id' => $newData['schedule_id'],
                'appointment_date' => $newData['appointment_date'],
                'start_time' => $newData['start_time'],
                'end_time' => $newData['end_time'],
                'rescheduled_from' => $appointment->id,
            ]);

            return $newAppointment;
        });
    }

    public function cancel(Appointment $appointment, string $reason = null): bool
    {
        return $appointment->update([
            'status' => AppointmentStatus::Cancelled,
            'cancelled_at' => now(),
            'cancelled_by' => auth()->id(),
            'cancellation_reason' => $reason,
        ]);
    }

    public function confirm(Appointment $appointment): bool
    {
        return $appointment->update([
            'status' => AppointmentStatus::Confirmed,
            'confirmed_at' => now(),
        ]);
    }

    public function checkIn(Appointment $appointment): bool
    {
        return $appointment->update([
            'status' => AppointmentStatus::CheckedIn,
            'checked_in_at' => now(),
        ]);
    }

    public function markNoShow(Appointment $appointment): bool
    {
        return $appointment->update([
            'status' => AppointmentStatus::NoShow,
        ]);
    }

    private function checkConflict(DoctorSchedule $schedule, $doctorId, $date, $startTime, $endTime): void
    {
        $conflictCount = Appointment::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled', 'rescheduled', 'no_show'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                  ->orWhereBetween('end_time', [$startTime, $endTime])
                  ->orWhere(function ($q) use ($startTime, $endTime) {
                      $q->where('start_time', '<=', $startTime)
                        ->where('end_time', '>=', $endTime);
                  });
            })
            ->count();

        if ($conflictCount >= $schedule->max_concurrent) {
            throw new \Exception('Slot unavailable.');
        }
    }
}

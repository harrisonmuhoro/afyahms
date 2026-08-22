<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Observers;

use App\Modules\Appointments\Enums\AppointmentStatus;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Services\ReminderSchedulerService;

class AppointmentObserver
{
    public function __construct(
        private readonly ReminderSchedulerService $reminderService
    ) {}

    /**
     * Handle the Appointment "created" event.
     */
    public function created(Appointment $appointment): void
    {
        // Schedule reminders for new appointments
        if ($appointment->status === AppointmentStatus::Scheduled || $appointment->status === AppointmentStatus::Confirmed) {
            $this->reminderService->scheduleReminders($appointment);
        }
    }

    /**
     * Handle the Appointment "updated" event.
     */
    public function updated(Appointment $appointment): void
    {
        // Check if status changed
        if ($appointment->isDirty('status')) {
            $originalStatus = $appointment->getOriginal('status');
            $oldStatus = $originalStatus instanceof AppointmentStatus
                ? $originalStatus
                : AppointmentStatus::tryFrom((string) $originalStatus);
            $newStatus = $appointment->status;

            if ($newStatus === AppointmentStatus::Cancelled && $oldStatus !== AppointmentStatus::Cancelled) {
                // Cancelled - send cancellation notification
                \App\Modules\Appointments\Jobs\SendAppointmentReminder::dispatch($appointment, 'cancellation')->onQueue('notifications');
            } elseif ($newStatus === AppointmentStatus::Rescheduled && $oldStatus !== AppointmentStatus::Rescheduled) {
                // Rescheduled - send reschedule notification
                \App\Modules\Appointments\Jobs\SendAppointmentReminder::dispatch($appointment, 'reschedule')->onQueue('notifications');
            }
        }
    }
}

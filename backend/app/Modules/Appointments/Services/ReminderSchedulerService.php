<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Jobs\SendAppointmentReminder;
use Illuminate\Support\Facades\Log;

class ReminderSchedulerService
{
    /**
     * Dispatches the queue jobs for appointment reminders per spec §7.3.
     */
    public function scheduleReminders(Appointment $appointment): void
    {
        // Don't schedule reminders in the past
        $now = now();
        $startsAt = $appointment->appointment_date->setTimeFromTimeString($appointment->start_time);

        // 1. Immediate confirmation
        SendAppointmentReminder::dispatch($appointment, 'confirmation')->onQueue('notifications');

        // 2. 24-hour reminder
        $time24h = $startsAt->copy()->subHours(24);
        if ($time24h->isFuture()) {
            SendAppointmentReminder::dispatch($appointment, '24h')
                ->delay($time24h)
                ->onQueue('notifications');
        }

        // 3. 2-hour reminder
        $time2h = $startsAt->copy()->subHours(2);
        if ($time2h->isFuture()) {
            SendAppointmentReminder::dispatch($appointment, '2h')
                ->delay($time2h)
                ->onQueue('notifications');
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Jobs\SendAppointmentReminder;

class ReminderSchedulerService
{
    /**
     * Dispatches the queue jobs for appointment reminders per spec §7.3.
     */
    public function scheduleReminders(Appointment $appointment): void
    {
        $startsAt = $appointment->appointment_date->setTimeFromTimeString($appointment->start_time);

        $this->dispatchForChannels($appointment, 'confirmation');

        // 2. 24-hour reminder
        $time24h = $startsAt->copy()->subHours(24);
        if ($time24h->isFuture()) {
            $this->dispatchForChannels($appointment, '24h', $time24h);
        }

        // 3. 2-hour reminder
        $time2h = $startsAt->copy()->subHours(2);
        if ($time2h->isFuture()) {
            $this->dispatchForChannels($appointment, '2h', $time2h);
        }
    }

    public function dispatchImmediate(Appointment $appointment, string $type): void
    {
        $this->dispatchForChannels($appointment, $type);
    }

    public function cancelPending(Appointment $appointment): void
    {
        $appointment->reminders()
            ->where('status', 'pending')
            ->update([
                'status' => 'cancelled',
                'error_message' => 'Cancelled because the appointment changed.',
            ]);
    }

    /** @return array<int, string> */
    private function channels(): array
    {
        return array_values(array_intersect(
            ['email', 'whatsapp'],
            (array) config('notifications.routing.appointment_reminder', ['email']),
        ));
    }

    private function dispatchForChannels(Appointment $appointment, string $type, mixed $delay = null): void
    {
        foreach ($this->channels() as $channel) {
            $job = SendAppointmentReminder::dispatch($appointment, $type, $channel)
                ->onQueue('notifications');

            if ($delay !== null) {
                $job->delay($delay);
            }
        }
    }
}

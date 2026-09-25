<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Jobs;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Models\AppointmentReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendAppointmentReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public Appointment $appointment,
        public string $type,
        public string $channel = 'email',
    ) {}

    public function handle(): void
    {
        $patient = $this->appointment->patient;

        if (! $patient) {
            throw new \RuntimeException('Appointment patient could not be loaded.');
        }

        if (in_array($this->appointment->status?->value, ['cancelled', 'rescheduled'], true)
            && in_array($this->type, ['24h', '2h'], true)) {
            return;
        }

        $reminder = AppointmentReminder::query()->firstOrNew([
            'appointment_id' => $this->appointment->id,
            'channel' => $this->channel,
            'type' => $this->type,
        ]);
        $reminder->scheduled_at ??= now();
        $reminder->status = 'pending';
        $reminder->error_message = null;
        $reminder->save();

        $patient->notify(new \App\Notifications\AppointmentReminderNotification(
            $this->appointment,
            $this->type,
            $this->channel,
        ));

        $reminder->update([
            'sent_at' => now(),
            'status' => 'sent',
        ]);
    }

    public function backoff(): array
    {
        return [30, 60, 120];
    }

    public function failed(Throwable $exception): void
    {
        AppointmentReminder::query()
            ->where('appointment_id', $this->appointment->id)
            ->where('channel', $this->channel)
            ->where('type', $this->type)
            ->latest('id')
            ->first()
            ?->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
    }
}

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
use Illuminate\Support\Facades\Log;

class SendAppointmentReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public string $type
    ) {}

    public function handle(): void
    {
        // Spec §7.3 specifies we just log for now unless configured
        $patient = $this->appointment->patient;
        
        $message = match($this->type) {
            'confirmation' => "Appointment confirmed for {$this->appointment->appointment_date->format('M d')} at {$this->appointment->start_time}.",
            '24h' => "Reminder: You have an appointment tomorrow at {$this->appointment->start_time}.",
            '2h' => "Reminder: Your appointment is in 2 hours.",
            'cancellation' => "Your appointment on {$this->appointment->appointment_date->format('M d')} has been cancelled.",
            'reschedule' => "Your appointment has been rescheduled to {$this->appointment->appointment_date->format('M d')} at {$this->appointment->start_time}.",
            default => "Appointment update.",
        };

        // Create the reminder record
        $reminder = AppointmentReminder::create([
            'appointment_id' => $this->appointment->id,
            'channel' => 'sms', // Defaulting to SMS
            'type' => $this->type,
            'scheduled_at' => now(),
            'sent_at' => now(),
            'status' => 'sent',
        ]);

        // Simulating sending SMS by logging it
        Log::channel('sms_reminders')->info("SMS to {$patient->phone}: {$message}");
    }
}

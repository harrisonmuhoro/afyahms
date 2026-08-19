<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Modules\Appointments\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class AppointmentBookedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public Appointment $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $patientName = $this->appointment->patient ? $this->appointment->patient->full_name : 'Unknown Patient';
        $date = $this->appointment->appointment_date->format('M d, Y h:i A');

        return [
            'title' => 'New Appointment Booked',
            'message' => "You have a new appointment scheduled with {$patientName} on {$date}.",
            'icon' => 'event',
            'appointment_id' => $this->appointment->id,
            'public_id' => $this->appointment->public_id,
        ];
    }
}

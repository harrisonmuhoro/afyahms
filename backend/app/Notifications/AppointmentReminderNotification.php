<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Modules\Appointments\Models\Appointment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class AppointmentReminderNotification extends Notification
{
    public function __construct(
        private readonly Appointment $appointment,
        private readonly string $type,
        private readonly string $channel = 'email',
    ) {}

    public function via(object $notifiable): array
    {
        return [$this->channel() === 'whatsapp'
            ? \App\Notifications\Channels\WhatsAppChannel::class
            : 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appointment = $this->appointment->loadMissing(['doctor', 'branch']);

        return (new MailMessage)
            ->subject($this->subject())
            ->greeting('Hello '.(method_exists($notifiable, 'fullName') ? $notifiable->fullName() : ($notifiable->name ?? 'there')).',')
            ->line($this->message())
            ->line('Reference: '.$appointment->appointment_number)
            ->line('Please contact the clinic if you need assistance.');
    }

    /** @return array{body: string} */
    public function toWhatsApp(object $notifiable): array
    {
        return ['body' => $this->message().' Ref: '.$this->appointment->appointment_number];
    }

    public function channel(): string
    {
        return $this->channel;
    }

    private function subject(): string
    {
        return match ($this->type) {
            'confirmation' => 'Afya HMS appointment confirmation',
            '24h' => 'Afya HMS appointment reminder - tomorrow',
            '2h' => 'Afya HMS appointment reminder - 2 hours',
            'cancellation' => 'Afya HMS appointment cancelled',
            'reschedule' => 'Afya HMS appointment rescheduled',
            default => 'Afya HMS appointment update',
        };
    }

    private function message(): string
    {
        $appointment = $this->appointment->loadMissing(['doctor', 'branch']);
        $doctor = $appointment->doctor?->name ? 'Dr. '.$appointment->doctor->name : 'your provider';
        $branch = $appointment->branch?->name ?? 'the clinic';
        $date = $appointment->appointment_date?->format('M d, Y');
        $time = substr((string) $appointment->start_time, 0, 5);

        return match ($this->type) {
            'confirmation' => "Your appointment with {$doctor} at {$branch} is booked for {$date} at {$time}.",
            '24h' => "Reminder: your appointment with {$doctor} at {$branch} is tomorrow, {$date}, at {$time}.",
            '2h' => "Reminder: your appointment with {$doctor} is in 2 hours at {$time}.",
            'cancellation' => "Your appointment at {$branch} on {$date} at {$time} has been cancelled.",
            'reschedule' => "Your appointment with {$doctor} has been rescheduled to {$date} at {$time}.",
            default => "Appointment update for {$date} at {$time}.",
        };
    }
}

<?php

declare(strict_types=1);

use App\Modules\Appointments\Models\Appointment;
use App\Notifications\AppointmentReminderNotification;
use App\Notifications\Channels\WhatsAppChannel;

it('uses email reminders by default and supports WhatsApp', function (): void {
    $appointment = new Appointment();

    expect((new AppointmentReminderNotification($appointment, '24h'))->via(new stdClass()))
        ->toBe(['mail']);

    expect((new AppointmentReminderNotification($appointment, '24h', 'whatsapp'))->via(new stdClass()))
        ->toBe([WhatsAppChannel::class]);
});

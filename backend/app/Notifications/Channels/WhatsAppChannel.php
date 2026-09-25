<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class WhatsAppChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toWhatsApp')) {
            throw new RuntimeException('Notification does not support WhatsApp delivery.');
        }

        $token = config('notifications.whatsapp.access_token');
        $phoneNumberId = config('notifications.whatsapp.phone_number_id');
        $phone = method_exists($notifiable, 'routeNotificationForWhatsApp')
            ? $notifiable->routeNotificationForWhatsApp($notification)
            : ($notifiable->phone ?? null);

        if (! $token || ! $phoneNumberId || ! $phone) {
            throw new RuntimeException('WhatsApp reminder delivery is not configured for this recipient.');
        }

        $phone = preg_replace('/[^+0-9]/', '', (string) $phone);
        if ($phone !== '' && str_starts_with($phone, '0')) {
            $phone = '+'.config('notifications.whatsapp.default_country_code').substr($phone, 1);
        }
        if ($phone === '' || ! str_starts_with($phone, '+')) {
            throw new RuntimeException('WhatsApp recipient phone number must use international format.');
        }

        $payload = $notification->toWhatsApp($notifiable);
        $baseUrl = rtrim((string) config('notifications.whatsapp.base_url'), '/');
        $version = trim((string) config('notifications.whatsapp.api_version'), '/');

        Http::withToken($token)
            ->acceptJson()
            ->post("{$baseUrl}/{$version}/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'text',
                'text' => ['preview_url' => false, 'body' => $payload['body']],
            ])
            ->throw();
    }
}

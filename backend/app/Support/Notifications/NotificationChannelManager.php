<?php

declare(strict_types=1);

namespace App\Support\Notifications;

use Illuminate\Notifications\Notification;
use InvalidArgumentException;

/**
 * Channel manager: resolves the configured provider for SMS / Email and
 * dispatches notifications through the Laravel Notification facade.
 *
 * App code never instantiates an AfricasTalking or Mailgun client directly.
 */
final class NotificationChannelManager
{
    /**
     * @param  array<int, string>  $channels  e.g. ['sms', 'email']
     */
    public function dispatch(object $notifiable, Notification $notification, array $channels = ['sms', 'email']): void
    {
        $notification->via(fn () => $this->resolveChannels($channels, $notification));
        $notifiable->notify($notification);
    }

    public function smsChannel(): string
    {
        $default = config('notifications.sms.default', 'africastalking');

        return $this->verifyChannel('sms', $default);
    }

    public function emailChannel(): string
    {
        $default = config('notifications.email.default', 'mailgun');

        return $this->verifyChannel('email', $default);
    }

    /**
     * @param  array<int, string>  $desired
     * @return array<int, string>
     */
    private function resolveChannels(array $desired, Notification $notification): array
    {
        $resolved = [];
        foreach ($desired as $ch) {
            $resolved[] = match ($ch) {
                'sms'   => $this->smsChannel(),
                'email' => $this->emailChannel(),
                default => throw new InvalidArgumentException("Unknown notification channel [{$ch}]."),
            };
        }

        return $resolved;
    }

    private function verifyChannel(string $kind, string $driver): string
    {
        $drivers = config("notifications.{$kind}.drivers", []);
        if (! array_key_exists($driver, $drivers)) {
            throw new InvalidArgumentException("No {$kind} driver configured for [{$driver}].");
        }

        // Custom channels live at App\Modules\Communication\Channels\* — we
        // register the FQN here so Laravel's Notification facade can resolve it.
        return match ($driver) {
            'africastalking' => \App\Modules\Communication\Channels\AfricasTalkingSmsChannel::class,
            'mailgun'        => \App\Modules\Communication\Channels\MailgunEmailChannel::class,
            'resend'         => \App\Modules\Communication\Channels\ResendEmailChannel::class,
            'log'            => $kind === 'sms'
                ? \App\Modules\Communication\Channels\LogSmsChannel::class
                : \Illuminate\Notifications\Channels\LogChannel::class,
            default => throw new InvalidArgumentException("Unsupported {$kind} driver [{$driver}]."),
        };
    }
}
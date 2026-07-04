<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

final class AccountReactivatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly User $actor,
        private readonly string $reason,
        private readonly string $reactivatedAt,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'account_reactivated',
            'message' => 'Your account has been reactivated.',
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
            'reason' => $this->reason,
            'reactivated_at' => $this->reactivatedAt,
        ];
    }
}

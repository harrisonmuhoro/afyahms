<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class QueueOverflowAlert extends Notification
{
    use Queueable;

    public $queueCount;

    /**
     * Create a new notification instance.
     */
    public function __construct(int $queueCount)
    {
        $this->queueCount = $queueCount;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Queue Overflow',
            'message' => "Warning: Patient queue has reached {$this->queueCount} waiting patients. Please assist.",
            'icon' => 'users',
            'queue_count' => $this->queueCount
        ];
    }
}

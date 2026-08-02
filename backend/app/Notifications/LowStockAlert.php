<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Medication;

class LowStockAlert extends Notification
{
    use Queueable;

    public $medication;

    /**
     * Create a new notification instance.
     */
    public function __construct(Medication $medication)
    {
        $this->medication = $medication;
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
            'title' => 'Low Stock Alert',
            'message' => "Stock Alert: {$this->medication->name} is running low ({$this->medication->stock_quantity} remaining).",
            'icon' => 'inventory',
            'medication_id' => $this->medication->id
        ];
    }
}

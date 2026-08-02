<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Medication;

class ExpiringItemsAlert extends Notification
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
        $expiryDate = $this->medication->expiry_date ? \Carbon\Carbon::parse($this->medication->expiry_date)->format('M d, Y') : 'Unknown';
        
        return [
            'title' => 'Expiring Item Alert',
            'message' => "Expiry Alert: {$this->medication->name} expires on {$expiryDate}.",
            'icon' => 'calendar',
            'medication_id' => $this->medication->id
        ];
    }
}

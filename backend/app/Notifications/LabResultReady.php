<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Modules\Laboratory\Models\LabOrder;

class LabResultReady extends Notification
{
    use Queueable;

    public $order;

    /**
     * Create a new notification instance.
     */
    public function __construct(LabOrder $order)
    {
        $this->order = $order;
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
        $testName = $this->order->test ? $this->order->test->name : 'Unknown Test';
        
        return [
            'title' => 'Lab Result Ready',
            'message' => "Lab Result: Results for {$testName} are ready for review.",
            'icon' => 'laboratory',
            'order_id' => $this->order->id
        ];
    }
}

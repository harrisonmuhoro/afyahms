<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Modules\Billing\Models\Bill;

class HighValuePaymentAlert extends Notification
{
    use Queueable;

    public $bill;
    public $amount;

    /**
     * Create a new notification instance.
     */
    public function __construct(Bill $bill, float $amount)
    {
        $this->bill = $bill;
        $this->amount = $amount;
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
        $formattedAmount = number_format($this->amount, 2);
        
        return [
            'title' => 'High Value Payment',
            'message' => "High value payment received: KES {$formattedAmount} for Invoice #{$this->bill->invoice_number}.",
            'icon' => 'wallet',
            'bill_id' => $this->bill->id
        ];
    }
}

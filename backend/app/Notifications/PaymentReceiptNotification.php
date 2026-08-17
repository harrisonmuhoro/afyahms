<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Modules\Billing\Models\Bill;
use App\Services\PdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceiptNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Bill $bill
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $hospitalName = config('hospital.name');
        
        $pdfService = app(PdfService::class);
        $pdfContent = $pdfService->getReceiptContent($this->bill);
        
        return (new MailMessage)
            ->subject("Payment Receipt from {$hospitalName}")
            ->greeting("Hello {$this->bill->patient->fullName()},")
            ->line("Thank you for your payment of Ksh " . number_format($this->bill->paid_amount, 2) . ".")
            ->line("Your receipt is attached to this email.")
            ->attachData($pdfContent, "Receipt_{$this->bill->public_id}.pdf", [
                'mime' => 'application/pdf',
            ]);
    }
}

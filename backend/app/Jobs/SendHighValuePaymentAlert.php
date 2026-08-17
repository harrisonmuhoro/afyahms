<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Modules\Billing\Models\Bill;
use App\Notifications\HighValuePaymentAlert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use App\Models\User;

/**
 * Queued job: notify admins of a high-value payment.
 *
 * Dispatched from BillingController when a payment > KES 50,000 is recorded.
 * Running asynchronously prevents the HTTP response from blocking on SMTP/SMS.
 */
final class SendHighValuePaymentAlert implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30; // retry after 30 seconds

    public function __construct(
        public readonly Bill $bill,
        public readonly float $amount,
    ) {}

    public function handle(): void
    {
        $admins = User::role(['superadmin', 'billing_admin'])->get();

        if ($admins->isEmpty()) {
            return;
        }

        Notification::send($admins, new HighValuePaymentAlert($this->bill, $this->amount));
    }
}


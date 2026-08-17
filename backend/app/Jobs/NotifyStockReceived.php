<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Modules\Inventory\Models\PurchaseOrder;
use App\Notifications\StockReceivedAlert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use App\Models\User;

final class NotifyStockReceived implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly PurchaseOrder $po,
    ) {}

    public function handle(): void
    {
        $staff = User::role(['pharmacist', 'inventory_manager'])->get();
        
        if ($staff->isEmpty()) {
            return;
        }

        Notification::send($staff, new StockReceivedAlert($this->po));
    }
}


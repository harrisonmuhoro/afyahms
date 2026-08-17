<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Modules\Laboratory\Models\LabOrder;
use App\Notifications\LabResultReady;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

final class NotifyLabResultReady implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly LabOrder $order,
    ) {}

    public function handle(): void
    {
        $this->order->loadMissing('orderedBy');
        
        if ($this->order->orderedBy) {
            $this->order->orderedBy->notify(new LabResultReady($this->order));
        }
    }
}


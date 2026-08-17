<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use App\Models\User;
use App\Notifications\QueueOverflowAlert;

final class NotifyQueueOverflow implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly int $waitingCount,
        public readonly int $branchId,
    ) {}

    public function handle(): void
    {
        $staff = User::role(['receptionist', 'superadmin'])
            ->where(function ($q) {
                $q->where('home_branch_id', $this->branchId)
                  ->orWhereNull('home_branch_id'); // Superadmins might not have a branch
            })
            ->get();

        if ($staff->isEmpty()) {
            return;
        }

        Notification::send($staff, new QueueOverflowAlert($this->waitingCount));
    }
}


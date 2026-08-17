<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use App\Models\User;
use App\Modules\Queue\Models\QueueTicket;
use App\Notifications\ConsultationRequested;

final class NotifyConsultationRequested implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly QueueTicket $ticket,
    ) {}

    public function handle(): void
    {
        $doctors = User::role('doctor')
            ->where('home_branch_id', $this->ticket->branch_id)
            ->get();

        if ($doctors->isEmpty()) {
            return;
        }

        Notification::send($doctors, new ConsultationRequested($this->ticket));
    }
}


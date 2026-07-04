<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Staff\Models\PendingContactChange;
use Illuminate\Console\Command;

final class PurgeExpiredPendingContactChanges extends Command
{
    protected $signature = 'staff:purge-expired-contact-changes';

    protected $description = 'Delete unverified pending staff contact changes after expiry.';

    public function handle(): int
    {
        $deleted = PendingContactChange::query()
            ->whereNull('verified_at')
            ->where('expires_at', '<=', now())
            ->delete();

        $this->info("Deleted {$deleted} expired pending contact change(s).");

        return self::SUCCESS;
    }
}

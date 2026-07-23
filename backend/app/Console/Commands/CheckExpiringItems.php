<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Medication;
use Carbon\Carbon;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ExpiringItemsAlert;

class CheckExpiringItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'afya:check-expiring-items';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for inventory items expiring within 60 days and alert pharmacists.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for expiring medications...');

        // Fetch medications expiring in the next 60 days
        $thresholdDate = Carbon::now()->addDays(60);
        $expiringItems = Medication::whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', $thresholdDate)
            ->whereDate('expiry_date', '>=', Carbon::now())
            ->get();

        if ($expiringItems->isEmpty()) {
            $this->info('No items expiring within 60 days.');
            return 0;
        }

        $this->info("Found {$expiringItems->count()} expiring item(s). Sending alerts...");

        $staff = User::role(['pharmacist', 'inventory_manager'])->get();

        if ($staff->isEmpty()) {
            $this->warn('No pharmacists or inventory managers found to notify.');
            return 1;
        }

        foreach ($expiringItems as $item) {
            Notification::send($staff, new ExpiringItemsAlert($item));
        }

        $this->info('Alerts dispatched successfully.');
        return 0;
    }
}

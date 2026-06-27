<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

final class HorizonServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        parent::boot();

        // Restrict Horizon UI to Hospital Admin only
        Horizon::night();

        // Tagging: queue dashboard uses these tags to filter
        Horizon::use(config('horizon.prefix', 'afya_horizon:'));
    }
}
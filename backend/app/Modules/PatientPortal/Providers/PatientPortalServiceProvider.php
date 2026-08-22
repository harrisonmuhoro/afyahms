<?php

namespace App\Modules\PatientPortal\Providers;

use Illuminate\Support\ServiceProvider;

class PatientPortalServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../routes.php');
    }
}

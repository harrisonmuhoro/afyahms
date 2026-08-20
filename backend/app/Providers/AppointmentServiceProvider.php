<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Observers\AppointmentObserver;

class AppointmentServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Appointment::observe(AppointmentObserver::class);
    }
}

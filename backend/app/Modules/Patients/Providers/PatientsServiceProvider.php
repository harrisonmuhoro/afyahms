<?php

declare(strict_types=1);

namespace App\Modules\Patients\Providers;

use App\Modules\Patients\Models\Patient;         // ← ADD
use App\Modules\Patients\Policies\PatientPolicy; // ← ADD
use Illuminate\Support\Facades\Gate;             // ← ADD
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class PatientsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Patient::class, PatientPolicy::class); // ← ADD

        Route::middleware(['api', 'auth:sanctum', 'active.branch'])
            ->prefix('api/v1/patients')
            ->name('patients.')
            ->group(__DIR__.'/../routes.php');
    }
}
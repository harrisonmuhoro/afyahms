<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Reporting\Controllers\ReportingController;

Route::middleware(['api', 'auth:sanctum'])
    ->prefix('api/v1/reports')
    ->name('reports.')
    ->group(function () {
    Route::get('dashboard', [ReportingController::class, 'getDashboardStats']);
    Route::get('{type}', [ReportingController::class, 'getReportData']);
});

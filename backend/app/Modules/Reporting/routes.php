<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Reporting\Controllers\ReportingController;
use App\Modules\Reporting\Controllers\ReportPdfController;

Route::middleware(['api', 'auth:sanctum'])
    ->prefix('api/v1/reports')
    ->name('reports.')
    ->group(function () {
    Route::get('dashboard', [ReportingController::class, 'getDashboardStats'])
        ->middleware('permission:reporting.read');
    Route::get('{type}', [ReportingController::class, 'getReportData'])
        ->middleware('permission:reporting.read');

    Route::post('pdf/{type}', [ReportPdfController::class, 'generate'])
        ->middleware('permission:reporting.read')
        ->name('pdf.generate');

    Route::get('pdf/job/{jobId}/status', [ReportPdfController::class, 'status'])
        ->middleware('permission:reporting.read')
        ->name('reports.pdf.status');

    Route::get('pdf/job/{jobId}/download', [ReportPdfController::class, 'download'])
        ->middleware('permission:reporting.read')
        ->name('reports.pdf.download');
});

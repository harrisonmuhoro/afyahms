<?php

declare(strict_types=1);

use App\Modules\Radiology\Controllers\RadiologyController;
use Illuminate\Support\Facades\Route;

/*
 * Radiology module routes.
 *
 * Base prefix: /api/v1  (added by RadiologyServiceProvider)
 * All routes require auth:sanctum.
 */

Route::middleware(['auth:sanctum', \App\Http\Middleware\SetActiveBranch::class])->group(function (): void {

    // ── Catalog ──────────────────────────────────────────────────────────────
    Route::get('/radiology/studies', [RadiologyController::class, 'catalog'])
        ->middleware('permission:radiology.read')
        ->name('radiology.studies.index');

    // ── Orders ───────────────────────────────────────────────────────────────
    Route::get('/radiology/orders', [RadiologyController::class, 'worklist'])
        ->middleware('permission:radiology.read')
        ->name('radiology.orders.worklist');

    Route::get('/radiology/visits/{visit}/orders', [RadiologyController::class, 'index'])
        ->whereNumber('visit')
        ->middleware('permission:radiology.read')
        ->name('radiology.orders.index');

    Route::post('/radiology/visits/{visit}/orders', [RadiologyController::class, 'store'])
        ->whereNumber('visit')
        ->middleware('permission:radiology.order')
        ->name('radiology.orders.store');

    Route::post('/radiology/orders/{order}/schedule', [RadiologyController::class, 'schedule'])
        ->middleware('permission:radiology.schedule')
        ->name('radiology.orders.schedule');

    Route::post('/radiology/orders/{order}/acquire', [RadiologyController::class, 'acquire'])
        ->middleware('permission:radiology.upload-image')
        ->name('radiology.orders.acquire');

    Route::post('/radiology/orders/{order}/cancel', [RadiologyController::class, 'cancel'])
        ->middleware('permission:radiology.order')
        ->name('radiology.orders.cancel');

    // ── Reports ───────────────────────────────────────────────────────────────
    Route::post('/radiology/orders/{order}/report', [RadiologyController::class, 'saveReport'])
        ->middleware('permission:radiology.report')
        ->name('radiology.reports.save');

    Route::post('/radiology/reports/{report}/finalize', [RadiologyController::class, 'finalize'])
        ->middleware('permission:radiology.report')
        ->name('radiology.reports.finalize');

    Route::post('/radiology/reports/{report}/amend', [RadiologyController::class, 'amend'])
        ->middleware('permission:radiology.report')
        ->name('radiology.reports.amend');

    Route::post('/radiology/reports/{report}/verify', [RadiologyController::class, 'verify'])
        ->middleware('permission:radiology.sign-report')
        ->name('radiology.reports.verify');
});

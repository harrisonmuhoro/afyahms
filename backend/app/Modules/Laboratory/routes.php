<?php

declare(strict_types=1);

use App\Modules\Laboratory\Controllers\LaboratoryController;
use App\Modules\Laboratory\Models\LabOrder;
use App\Modules\Laboratory\Models\LabResult;
use App\Modules\Queue\Models\Visit;
use Illuminate\Support\Facades\Route;

/*
 * Laboratory module routes.
 *
 * Base prefix: /api/v1  (added by LaboratoryServiceProvider)
 * All routes require auth:sanctum.
 */

Route::middleware(['auth:sanctum', \App\Http\Middleware\SetActiveBranch::class])->group(function (): void {

    // ── Catalog ──────────────────────────────────────────────────────────────
    Route::get('/lab/tests', [LaboratoryController::class, 'catalog'])
        ->middleware('permission:lab.read')
        ->name('lab.tests.index');

    // ── Orders ───────────────────────────────────────────────────────────────
    Route::get('/lab/orders', [LaboratoryController::class, 'worklist'])
        ->middleware('permission:lab.read')
        ->name('lab.orders.worklist');

    Route::get('/lab/visits/{visit}/orders', [LaboratoryController::class, 'index'])
        ->whereNumber('visit')
        ->middleware('permission:lab.read')
        ->name('lab.orders.index');

    Route::post('/lab/visits/{visit}/orders', [LaboratoryController::class, 'store'])
        ->whereNumber('visit')
        ->middleware('permission:lab.order')
        ->name('lab.orders.store');

    Route::post('/lab/orders/{order}/collect', [LaboratoryController::class, 'collect'])
        ->middleware('permission:lab.collect')
        ->name('lab.orders.collect');

    Route::post('/lab/orders/{order}/process', [LaboratoryController::class, 'process'])
        ->middleware('permission:lab.process')
        ->name('lab.orders.process');

    Route::post('/lab/orders/{order}/cancel', [LaboratoryController::class, 'cancel'])
        ->middleware('permission:lab.order')
        ->name('lab.orders.cancel');

    // ── Results ───────────────────────────────────────────────────────────────
    Route::post('/lab/orders/{order}/result', [LaboratoryController::class, 'recordResult'])
        ->middleware('permission:lab.result')
        ->name('lab.results.store');

    Route::post('/lab/results/{result}/verify', [LaboratoryController::class, 'verify'])
        ->middleware('permission:lab.verify')
        ->name('lab.results.verify');
});

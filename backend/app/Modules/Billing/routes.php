<?php

declare(strict_types=1);

use App\Modules\Billing\Controllers\BillingController;
use App\Modules\Queue\Models\Visit;
use Illuminate\Support\Facades\Route;

/*
 * Billing module routes.
 *
 * Base prefix: /api/v1
 * All routes require auth:sanctum.
 * Visit model is resolved by its primary key (integer id).
 */

Route::middleware(['auth:sanctum'])->group(function (): void {

    // Bill for a specific visit
    Route::get('/billing/visits/{visit}/bill',         [BillingController::class, 'show'])
        ->whereNumber('visit')
        ->middleware('permission:billing.read')
        ->name('billing.visits.bill.show');

    Route::get('/billing/visits/{visit}/bill/status',  [BillingController::class, 'status'])
        ->whereNumber('visit')
        ->middleware('permission:billing.read')
        ->name('billing.visits.bill.status');

    Route::post('/billing/visits/{visit}/bill/items',  [BillingController::class, 'addItem'])
        ->whereNumber('visit')
        ->middleware('permission:billing.write')
        ->name('billing.visits.bill.items.store');

    Route::post('/billing/visits/{visit}/bill/pay',    [BillingController::class, 'recordPayment'])
        ->whereNumber('visit')
        ->middleware('permission:billing.write')
        ->name('billing.visits.bill.pay');

    Route::post('/billing/visits/{visit}/bill/clear',  [BillingController::class, 'markCleared'])
        ->whereNumber('visit')
        ->middleware('permission:billing.clear')
        ->name('billing.visits.bill.clear');

    Route::post('/billing/visits/{visit}/bill/waive',  [BillingController::class, 'markWaived'])
        ->whereNumber('visit')
        ->middleware('permission:billing.clear')
        ->name('billing.visits.bill.waive');
});

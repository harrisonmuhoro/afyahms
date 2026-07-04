<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Inventory\Controllers\InventoryController;

Route::middleware(['api', 'auth:sanctum'])
    ->prefix('api/v1/inventory')
    ->name('inventory.')
    ->group(function () {
    Route::get('items', [InventoryController::class, 'getItems'])
        ->middleware('permission:inventory.read');
});

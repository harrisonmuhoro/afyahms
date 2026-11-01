<?php

declare(strict_types=1);

use App\Modules\Inventory\Controllers\InventoryController;
use Illuminate\Support\Facades\Route;

/*
 * Inventory module routes.
 *
 * Base prefix: /api/v1  (added by InventoryServiceProvider)
 * All routes require auth:sanctum.
 */

Route::middleware(['auth:sanctum'])->group(function (): void {

    Route::get('/inventory/kpi-summary', [InventoryController::class, 'kpiSummary'])
        ->middleware('permission:inventory.read')
        ->name('inventory.kpi.summary');

    // ── Items ──────────────────────────────────────────────────────────────
    Route::get('/inventory/items', [InventoryController::class, 'getItems'])
        ->middleware('permission:inventory.read')
        ->name('inventory.items.index');

    Route::post('/inventory/items', [InventoryController::class, 'createItem'])
        ->middleware('permission:inventory.manage')
        ->name('inventory.items.store');

    Route::put('/inventory/items/{item}', [InventoryController::class, 'updateItem'])
        ->middleware('permission:inventory.manage')
        ->name('inventory.items.update');

    // ── Batches & Adjustments ──────────────────────────────────────────────
    Route::get('/inventory/batches/expiring', [InventoryController::class, 'getExpiringBatches'])
        ->middleware('permission:inventory.read')
        ->name('inventory.batches.expiring');

    Route::post('/inventory/items/{item}/receive', [InventoryController::class, 'receiveBatch'])
        ->middleware('permission:inventory.receive-grn')
        ->name('inventory.items.receive');

    Route::post('/inventory/items/{item}/adjust', [InventoryController::class, 'adjustStock'])
        ->middleware('permission:inventory.adjust-stock')
        ->name('inventory.items.adjust');

    // ── Suppliers ──────────────────────────────────────────────────────────
    Route::get('/inventory/suppliers', [InventoryController::class, 'getSuppliers'])
        ->middleware('permission:inventory.read')
        ->name('inventory.suppliers.index');

    Route::post('/inventory/suppliers', [InventoryController::class, 'createSupplier'])
        ->middleware('permission:inventory.manage')
        ->name('inventory.suppliers.store');

    // ── Purchase Orders ────────────────────────────────────────────────────
    Route::get('/inventory/purchase-orders', [InventoryController::class, 'getPurchaseOrders'])
        ->middleware('permission:purchase-orders.read')
        ->name('inventory.purchase_orders.index');

    Route::post('/inventory/purchase-orders', [InventoryController::class, 'createPurchaseOrder'])
        ->middleware('permission:purchase-orders.create')
        ->name('inventory.purchase_orders.store');

    Route::post('/inventory/purchase-orders/{po}/submit', [InventoryController::class, 'submitPurchaseOrder'])
        ->middleware('permission:purchase-orders.submit')
        ->name('inventory.purchase_orders.submit');

    Route::post('/inventory/purchase-orders/{po}/receive', [InventoryController::class, 'receivePurchaseOrder'])
        ->middleware('permission:purchase-orders.receive')
        ->name('inventory.purchase_orders.receive');

    Route::post('/inventory/purchase-orders/{po}/cancel', [InventoryController::class, 'cancelPurchaseOrder'])
        ->middleware('permission:purchase-orders.cancel')
        ->name('inventory.purchase_orders.cancel');
});

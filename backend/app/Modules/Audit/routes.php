<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Audit\Controllers\AuditController;

Route::middleware(['api', 'auth:sanctum'])
    ->prefix('api/v1/audit')
    ->name('audit.')
    ->group(function () {
    Route::get('/logs', [AuditController::class, 'getLogs']);
});

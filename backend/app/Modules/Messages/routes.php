<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Messages\Controllers\MessageController;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/conversations', [MessageController::class, 'index']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'show']);
    Route::post('/messages', [MessageController::class, 'store']);
});

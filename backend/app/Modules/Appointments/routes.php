<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Appointments\Controllers\AppointmentController;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']);
});

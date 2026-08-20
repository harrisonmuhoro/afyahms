<?php

declare(strict_types=1);

use App\Modules\Appointments\Controllers\AppointmentController;
use App\Modules\Appointments\Controllers\ScheduleController;
use App\Modules\Appointments\Controllers\SlotController;
use App\Modules\Appointments\Controllers\Portal\PatientAppointmentController;
use Illuminate\Support\Facades\Route;

// Staff Routes (require Sanctum auth)
Route::middleware('auth:sanctum')->prefix('v1/appointments')->group(function () {
    // Schedules
    Route::apiResource('schedules', ScheduleController::class);
    
    // Slots
    Route::get('slots', [SlotController::class, 'index']);

    // Appointments (Core CRUD)
    Route::apiResource('/', AppointmentController::class)->parameters(['' => 'appointment']);
    
    // Appointment Actions
    Route::post('{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::post('{appointment}/check-in', [AppointmentController::class, 'checkIn']);
});

// Patient Portal Routes (require Sanctum auth)
Route::middleware('auth:sanctum')->prefix('v1/portal/appointments')->group(function () {
    Route::get('/', [PatientAppointmentController::class, 'index']);
    Route::post('/', [PatientAppointmentController::class, 'store']);
    Route::post('{appointment}/cancel', [PatientAppointmentController::class, 'cancel']);
});

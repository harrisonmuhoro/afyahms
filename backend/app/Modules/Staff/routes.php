<?php

declare(strict_types=1);

use App\Modules\Staff\Controllers\StaffProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('profile')->name('profile.')->group(function (): void {
    Route::get('/', [StaffProfileController::class, 'show'])->name('show');

    Route::patch('/basic', [StaffProfileController::class, 'updateBasic'])
        ->middleware('permission:profile.self.update.basic')
        ->name('basic.update');

    Route::patch('/contact', [StaffProfileController::class, 'updateContact'])
        ->middleware('permission:profile.self.update.contact')
        ->name('contact.update');

    Route::post('/contact/verify', [StaffProfileController::class, 'verifyContact'])
        ->middleware('permission:profile.self.update.contact')
        ->name('contact.verify');

    Route::patch('/password', [StaffProfileController::class, 'updatePassword'])
        ->middleware('permission:profile.self.update.password')
        ->name('password.update');

    Route::post('/photo', [StaffProfileController::class, 'uploadPhoto'])
        ->middleware('permission:profile.self.upload.photo')
        ->name('photo.upload');
});

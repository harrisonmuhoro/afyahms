<?php

declare(strict_types=1);

use App\Modules\Admin\Controllers\RolesController;
use App\Modules\Admin\Controllers\StaffAdminController;
use App\Modules\Admin\Controllers\UsersController;
use Illuminate\Support\Facades\Route;

Route::prefix('users')->name('users.')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/',         [UsersController::class, 'index'])->middleware('permission:users.list')->name('index');
    Route::post('/',        [UsersController::class, 'store'])->middleware('permission:users.create')->name('store');
    Route::get('/{user}',   [UsersController::class, 'show'])->middleware('permission:users.read')->name('show');
    Route::patch('/{user}', [UsersController::class, 'update'])->middleware('permission:users.update')->name('update');
    Route::post('/{user}/deactivate', [UsersController::class, 'deactivate'])->middleware('permission:users.deactivate')->name('deactivate');
    Route::post('/{user}/reactivate', [UsersController::class, 'reactivate'])->middleware('permission:users.activate')->name('reactivate');
    Route::delete('/{user}',[UsersController::class, 'destroy'])->middleware('permission:users.delete')->name('destroy');
});

Route::prefix('roles')->name('roles.')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/',                    [RolesController::class, 'index'])->middleware('permission:roles.list')->name('index');
    Route::get('/permissions',         [RolesController::class, 'permissions'])->middleware('permission:roles.list')->name('permissions');
    Route::post('/{role}/permissions', [RolesController::class, 'syncPermissions'])->middleware('permission:roles.assign-permission')->name('sync-permissions');
});

Route::prefix('admin/staff')->name('staff.')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [StaffAdminController::class, 'index'])->middleware('permission:staff.update')->name('index');
    Route::post('/', [StaffAdminController::class, 'store'])->middleware('permission:staff.update')->name('store');
    Route::get('/{user}', [StaffAdminController::class, 'show'])->middleware('permission:staff.update')->name('show');
    Route::patch('/{user}/employment', [StaffAdminController::class, 'updateEmployment'])->middleware('permission:staff.update')->name('employment.update');
    Route::put('/{user}/branches', [StaffAdminController::class, 'updateBranches'])->middleware('permission:staff.update')->name('branches.update');
    Route::post('/{user}/role', [StaffAdminController::class, 'updateRole'])->middleware('permission:staff.role.assign')->name('role.update');
    Route::post('/{user}/password-reset', [StaffAdminController::class, 'triggerPasswordReset'])->middleware('permission:users.reset-password')->name('password-reset');
});

use App\Modules\Admin\Controllers\SettingsController;
Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/', [SettingsController::class, 'index'])
        ->middleware('permission:settings.read')
        ->name('index');
    Route::put('/', [SettingsController::class, 'update'])
        ->middleware('permission:settings.update')
        ->name('update');
});

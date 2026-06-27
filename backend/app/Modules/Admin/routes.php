<?php

declare(strict_types=1);

use App\Modules\Admin\Controllers\RolesController;
use App\Modules\Admin\Controllers\UsersController;
use App\Modules\Admin\Controllers\BranchController;
use Illuminate\Support\Facades\Route;

Route::prefix('users')->name('users.')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/',         [UsersController::class, 'index'])->middleware('permission:users.list')->name('index');
    Route::post('/',        [UsersController::class, 'store'])->middleware('permission:users.create')->name('store');
    Route::get('/{user}',   [UsersController::class, 'show'])->middleware('permission:users.read')->name('show');
    Route::patch('/{user}', [UsersController::class, 'update'])->middleware('permission:users.update')->name('update');
    Route::delete('/{user}',[UsersController::class, 'destroy'])->middleware('permission:users.delete')->name('destroy');
});

Route::prefix('roles')->name('roles.')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/',                    [RolesController::class, 'index'])->middleware('permission:roles.list')->name('index');
    Route::get('/permissions',         [RolesController::class, 'permissions'])->middleware('permission:roles.list')->name('permissions');
    Route::post('/{role}/permissions', [RolesController::class, 'syncPermissions'])->middleware('permission:roles.assign-permission')->name('sync-permissions');
});

Route::prefix('branches')->name('branches.')->group(function () {
    Route::get('/', [BranchController::class, 'index'])->name('index');
});

use App\Modules\Admin\Controllers\SettingsController;
Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/', [SettingsController::class, 'index'])->name('index');
    Route::put('/', [SettingsController::class, 'update'])->name('update');
});
<?php

declare(strict_types=1);

declare(strict_types=1);

use App\Modules\Tenancy\Controllers\BranchController;
use Illuminate\Support\Facades\Route;

Route::middleware(['permission:branches.read'])
    ->get('/', [BranchController::class, 'index'])
    ->name('index');

Route::middleware(['permission:branches.read'])
    ->get('/{id}', [BranchController::class, 'show'])
    ->name('show');

Route::middleware(['permission:branches.create'])
    ->post('/', [BranchController::class, 'store'])
    ->name('store');

Route::middleware(['permission:branches.update'])
    ->patch('/{id}', [BranchController::class, 'update'])
    ->name('update');
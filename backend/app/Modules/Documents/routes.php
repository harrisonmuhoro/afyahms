<?php

declare(strict_types=1);

use App\Modules\Documents\Controllers\DocumentsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['permission:documents.read'])
    ->get('/{document}', [DocumentsController::class, 'show'])
    ->name('show');

Route::middleware(['permission:documents.delete'])
    ->delete('/{document}', [DocumentsController::class, 'destroy'])
    ->name('destroy');
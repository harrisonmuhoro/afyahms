<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The InventoryItem model (Inventory extended module) uses SoftDeletes,
     * but the original inventory_items table predates it and was created
     * without a deleted_at column. Add it so queries stop failing with
     * "Unknown column 'inventory_items.deleted_at'".
     */
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};

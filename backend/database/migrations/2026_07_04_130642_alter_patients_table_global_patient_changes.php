<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->change();
            $table->string('guardian_name', 255)->nullable()->after('national_id');
            $table->string('guardian_national_id', 255)->nullable()->after('guardian_name');
            $table->string('guardian_relationship', 80)->nullable()->after('guardian_national_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable(false)->change();
            $table->dropColumn('guardian_name');
            $table->dropColumn('guardian_national_id');
            $table->dropColumn('guardian_relationship');
        });
    }
};

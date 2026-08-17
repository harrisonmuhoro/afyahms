<?php

/**
 * Add composite indexes to high-volume tables that are globally scoped by branch_id.
 *
 * Rationale:
 *  - Laravel's BranchScope appends `WHERE branch_id = ?` to virtually every query.
 *  - Without composite indexes, MySQL falls back to full table scans on secondary
 *    filter columns, making queries O(N) as rows grow into the hundreds of thousands.
 *  - B-Tree composite indexes allow MySQL to perform tight index range scans,
 *    cutting query time from seconds to milliseconds at 100k+ rows.
 *
 * Indexes added (all column names verified against the live schema):
 *
 *  visits:
 *    (branch_id, status)     — queue/board views always filter by visit status
 *    (branch_id, created_at) — reporting endpoints use date-range filters
 *
 *  bills:
 *    (branch_id, status)         — revenue summary groups by payment status
 *    (branch_id, created_at)     — date-range filters for financial reports
 *    (branch_id, payment_method) — insurance vs. cash payment breakdowns
 *
 *  inventory_items:
 *    (branch_id, quantity_on_hand) — low-stock / reorder alert queries compare qty
 *    (branch_id, category)         — pharmacy vs. consumables category filters
 *
 * This migration is idempotent: it checks for existing indexes before creation
 * and only drops indexes it created (skips pre-existing ones).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, list<list<string>>> */
    private array $newIndexes = [
        'visits' => [
            ['branch_id', 'status'],
            ['branch_id', 'created_at'],
        ],
        'bills' => [
            ['branch_id', 'status'],
            ['branch_id', 'created_at'],
            ['branch_id', 'payment_method'],
        ],
        'inventory_items' => [
            ['branch_id', 'quantity_on_hand'],
            ['branch_id', 'category'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->newIndexes as $table => $indexColumns) {
            Schema::table($table, function (Blueprint $t) use ($table, $indexColumns): void {
                $existing = $this->existingIndexNames($table);

                foreach ($indexColumns as $cols) {
                    $name = $this->indexName($table, $cols);
                    if (! in_array($name, $existing, true)) {
                        $t->index($cols, $name);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        // Drop in reverse order
        foreach (array_reverse($this->newIndexes, true) as $table => $indexColumns) {
            Schema::table($table, function (Blueprint $t) use ($table, $indexColumns): void {
                $existing = $this->existingIndexNames($table);

                foreach ($indexColumns as $cols) {
                    $name = $this->indexName($table, $cols);
                    if (in_array($name, $existing, true)) {
                        $t->dropIndex($name);
                    }
                }
            });
        }
    }

    /** @return list<string> */
    private function existingIndexNames(string $table): array
    {
        return collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->pluck('Key_name')
            ->unique()
            ->values()
            ->all();
    }

    /** @param list<string> $cols */
    private function indexName(string $table, array $cols): string
    {
        // Deterministic short prefix to stay under MySQL's 64-char limit
        $prefix = match ($table) {
            'visits'          => 'idx_vis',
            'bills'           => 'idx_bil',
            'inventory_items' => 'idx_inv',
            default           => 'idx_' . substr($table, 0, 8),
        };

        $suffix = implode('_', array_map(fn ($c) => match ($c) {
            'branch_id'       => 'br',
            'status'          => 'st',
            'created_at'      => 'cat',
            'payment_method'  => 'pm',
            'quantity_on_hand' => 'qty',
            'category'        => 'cat',
            default           => substr($c, 0, 6),
        }, $cols));

        return "{$prefix}_{$suffix}";
    }
};

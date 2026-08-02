<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Audit record for any change to stock quantity.
 *
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property int         $inventory_item_id
 * @property int|null    $inventory_batch_id
 * @property int         $performed_by
 * @property int         $quantity_before
 * @property int         $quantity_change    Positive = addition, negative = reduction
 * @property int         $quantity_after
 * @property string      $reason             received|dispensed|expired|damaged|transferred|correction
 * @property string|null $notes
 */
final class StockAdjustment extends Model
{
    // No soft-deletes: audit trail must be immutable
    public $timestamps = true;

    protected $table = 'stock_adjustments';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'inventory_item_id', 'inventory_batch_id',
        'performed_by', 'quantity_before', 'quantity_change', 'quantity_after',
        'reason', 'notes',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'quantity_before' => 'integer',
        'quantity_change' => 'integer',
        'quantity_after'  => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $adj): void {
            if (empty($adj->public_id)) {
                $adj->public_id = (string) Str::uuid();
            }
        });
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'performed_by');
    }
}

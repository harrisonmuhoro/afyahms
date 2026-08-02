<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A received stock batch (lot) tied to a specific inventory item.
 *
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property int         $inventory_item_id
 * @property string      $batch_number
 * @property int|null    $supplier_id
 * @property int         $quantity_received
 * @property int         $quantity_remaining
 * @property float       $unit_cost
 * @property string|null $manufacture_date
 * @property string|null $expiry_date
 * @property string      $status    active|exhausted|recalled|expired
 */
final class InventoryBatch extends Model
{
    use SoftDeletes;

    protected $table = 'inventory_batches';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'inventory_item_id', 'batch_number',
        'supplier_id', 'quantity_received', 'quantity_remaining',
        'unit_cost', 'manufacture_date', 'expiry_date', 'status',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'quantity_received'  => 'integer',
        'quantity_remaining' => 'integer',
        'unit_cost'          => 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $batch): void {
            if (empty($batch->public_id)) {
                $batch->public_id = (string) Str::uuid();
            }
        });
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class, 'inventory_batch_id');
    }

    public function isExpiringSoon(int $withinDays = 30): bool
    {
        if ($this->expiry_date === null) {
            return false;
        }

        return now()->diffInDays($this->expiry_date, false) <= $withinDays;
    }
}

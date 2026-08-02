<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Re-exports the existing inventory_items table as a proper model.
 *
 * @property int         $id
 * @property string      $sku
 * @property string      $name
 * @property string|null $category
 * @property string      $unit
 * @property int         $quantity_on_hand
 * @property int         $reorder_level
 * @property float|null  $unit_cost
 * @property string|null $expiry_date
 * @property int|null    $branch_id
 */
final class InventoryItem extends Model
{
    use SoftDeletes;

    protected $table = 'inventory_items';

    /** @var array<int, string> */
    protected $fillable = [
        'sku', 'name', 'category', 'unit',
        'quantity_on_hand', 'reorder_level', 'unit_cost',
        'expiry_date', 'branch_id',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'quantity_on_hand' => 'integer',
        'reorder_level'    => 'integer',
        'unit_cost'        => 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class, 'inventory_item_id');
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class, 'inventory_item_id');
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'inventory_item_id');
    }

    public function isLowStock(): bool
    {
        return $this->quantity_on_hand <= $this->reorder_level;
    }
}

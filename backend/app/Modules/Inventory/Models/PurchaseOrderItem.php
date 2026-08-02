<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single line item within a purchase order.
 *
 * @property int    $id
 * @property int    $purchase_order_id
 * @property int    $inventory_item_id
 * @property int    $quantity_ordered
 * @property int    $quantity_received
 * @property float  $unit_cost
 * @property float  $total_cost
 * @property string|null $notes
 */
final class PurchaseOrderItem extends Model
{
    protected $table = 'purchase_order_items';

    /** @var array<int, string> */
    protected $fillable = [
        'purchase_order_id', 'inventory_item_id',
        'quantity_ordered', 'quantity_received',
        'unit_cost', 'total_cost', 'notes',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'quantity_ordered'  => 'integer',
        'quantity_received' => 'integer',
        'unit_cost'         => 'float',
        'total_cost'        => 'float',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}

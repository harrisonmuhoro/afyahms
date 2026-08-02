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
 * Purchase Order header.
 *
 * Status workflow: draft → sent → acknowledged → shipped → received | cancelled
 *
 * @property int         $id
 * @property string      $public_id
 * @property string      $po_number
 * @property int         $branch_id
 * @property int         $supplier_id
 * @property int         $raised_by
 * @property int|null    $approved_by
 * @property string      $status
 * @property float       $total_amount
 * @property string|null $expected_delivery_date
 * @property string|null $delivered_date
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 */
final class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $table = 'purchase_orders';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'po_number', 'branch_id', 'supplier_id',
        'raised_by', 'approved_by', 'status', 'total_amount',
        'expected_delivery_date', 'delivered_date', 'notes',
        'sent_at', 'approved_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'total_amount' => 'float',
        'sent_at'      => 'datetime',
        'approved_at'  => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $po): void {
            if (empty($po->public_id)) {
                $po->public_id = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'raised_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }
}

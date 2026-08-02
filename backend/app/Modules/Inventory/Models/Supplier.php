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
 * Supplier master record.
 *
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property string      $name
 * @property string|null $code
 * @property string|null $category      pharma|lab|consumables|equipment|other
 * @property string|null $contact_person
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $address
 * @property float|null  $rating
 * @property bool        $is_active
 */
final class Supplier extends Model
{
    use SoftDeletes;

    protected $table = 'suppliers';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'name', 'code', 'category',
        'contact_person', 'email', 'phone', 'address', 'rating', 'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'rating'    => 'float',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $supplier): void {
            if (empty($supplier->public_id)) {
                $supplier->public_id = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'supplier_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class, 'supplier_id');
    }
}

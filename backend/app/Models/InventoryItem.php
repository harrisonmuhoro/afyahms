<?php

namespace App\Models;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    protected $fillable = [
        'sku', 'name', 'category', 'unit', 'quantity_on_hand', 
        'reorder_level', 'unit_cost', 'expiry_date', 'branch_id'
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class); // Assuming Branch model exists
    }
}

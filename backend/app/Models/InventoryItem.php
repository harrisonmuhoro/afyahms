<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Tenancy\Models\Branch;

class InventoryItem extends Model
{
    protected $fillable = [
        'sku', 'name', 'category', 'unit', 'quantity_on_hand', 
        'reorder_level', 'unit_cost', 'expiry_date', 'branch_id'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class); // Assuming Branch model exists
    }
}

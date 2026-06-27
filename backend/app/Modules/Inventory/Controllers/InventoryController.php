<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function getItems(Request $request)
    {
        $query = InventoryItem::query();

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->has('low_stock') && $request->query('low_stock') === 'true') {
            $query->whereColumn('quantity_on_hand', '<=', 'reorder_level');
        }

        $items = $query->with('branch')->get();
        return response()->json(['data' => $items]); // Note: React Query expects res.data.data or res.data depending on frontend api.ts
    }
}

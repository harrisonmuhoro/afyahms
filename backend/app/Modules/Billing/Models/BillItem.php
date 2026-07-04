<?php

declare(strict_types=1);

namespace App\Modules\Billing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single line-item on a bill (e.g. consultation fee, medication, lab test).
 *
 * @property int    $id
 * @property int    $bill_id
 * @property string $description
 * @property string $category       service|medication|lab|radiology|consultation
 * @property float  $unit_price
 * @property int    $quantity
 * @property float  $total_price
 */
final class BillItem extends Model
{
    protected $table = 'bill_items';

    /** @var array<int, string> */
    protected $fillable = [
        'bill_id', 'description', 'category',
        'unit_price', 'quantity', 'total_price',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'unit_price'  => 'float',
        'quantity'    => 'integer',
        'total_price' => 'float',
    ];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class, 'bill_id');
    }
}

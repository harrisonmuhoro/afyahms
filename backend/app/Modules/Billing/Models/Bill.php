<?php

declare(strict_types=1);

namespace App\Modules\Billing\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property int         $visit_id
 * @property int         $patient_id
 * @property float       $total_amount
 * @property float       $paid_amount
 * @property string      $status        pending|partial|cleared|waived
 * @property string|null $payment_method
 * @property string|null $notes
 * @property int|null    $cleared_by
 * @property \Illuminate\Support\Carbon|null $cleared_at
 */
final class Bill extends Model
{
    use SoftDeletes;

    protected $table = 'bills';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'visit_id', 'patient_id',
        'total_amount', 'paid_amount', 'status',
        'payment_method', 'notes', 'cleared_by', 'cleared_at',
        'mpesa_merchant_request_id', 'mpesa_checkout_request_id', 'mpesa_receipt',
        'mpesa_phone', 'mpesa_amount', 'mpesa_status', 'mpesa_result_code',
        'mpesa_result_description', 'mpesa_transaction_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'total_amount' => 'float',
        'paid_amount'  => 'float',
        'cleared_at'   => 'datetime',
        'mpesa_amount' => 'float',
        'mpesa_result_code' => 'integer',
        'mpesa_transaction_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $bill): void {
            if (empty($bill->public_id)) {
                $bill->public_id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function items(): HasMany
    {
        return $this->hasMany(BillItem::class, 'bill_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class, 'bill_id');
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Queue\Models\Visit::class, 'visit_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    /** Returns true if this bill requires no further payment. */
    public function isCleared(): bool
    {
        return in_array($this->status, ['cleared', 'waived'], true);
    }
}

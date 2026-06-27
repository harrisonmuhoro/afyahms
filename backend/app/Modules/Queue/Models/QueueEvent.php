<?php

declare(strict_types=1);

namespace App\Modules\Queue\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only state-transition ledger. Never updated, never deleted.
 *
 * @property int    $id
 * @property int    $branch_id
 * @property int    $queue_ticket_id
 * @property int    $station_id
 * @property int|null $actor_user_id
 * @property string $event_type
 * @property string|null $from_state
 * @property string|null $to_state
 * @property string|null $mts_category
 * @property string|null $reason
 * @property array|null $metadata
 * @property \Illuminate\Support\Carbon $occurred_at
 */
class QueueEvent extends Model
{
    protected $table = 'queue_events';

    public $timestamps = false;

    protected $fillable = [
        'branch_id', 'queue_ticket_id', 'station_id', 'actor_user_id',
        'event_type', 'from_state', 'to_state', 'mts_category',
        'reason', 'metadata', 'occurred_at',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'occurred_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        // Append-only: refuse updates and deletes.
        static::updating(function (): bool {
            return false;
        });
        static::deleting(function (): bool {
            return false;
        });
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(QueueTicket::class, 'queue_ticket_id');
    }
}

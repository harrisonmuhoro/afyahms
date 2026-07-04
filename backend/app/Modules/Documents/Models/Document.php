<?php

declare(strict_types=1);

namespace App\Modules\Documents\Models;

use App\Models\User;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A document stored via StorageManager. Models can be related via morphTo.
 *
 * Foundation §7: clinical files served via signed URLs only.
 */
final class Document extends Model
{
    use SoftDeletes;

    protected $table = 'documents';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'uploaded_by', 'documentable_type', 'documentable_id',
        'disk', 'path', 'mime_type', 'size_bytes', 'original_filename',
        'category', 'metadata', 'checksum_sha256',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'metadata'    => 'encrypted:array',
        'size_bytes'  => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

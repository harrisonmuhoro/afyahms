<?php

declare(strict_types=1);

namespace App\Modules\Emr\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Global ICD-10 master. Reference data — NOT branch-scoped (foundation §4
 * exempts global reference data from `branch_id`).
 *
 * @property int    $id
 * @property string $code
 * @property string $description
 * @property string|null $category
 * @property bool   $is_active
 */
class DiagnosisCatalog extends Model
{
    protected $table = 'diagnoses_catalog';

    protected $fillable = [
        'code', 'description', 'category', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}

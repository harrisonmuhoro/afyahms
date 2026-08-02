<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents a test in the lab catalog (e.g., "Full Blood Count", "Malaria RDT").
 *
 * @property int         $id
 * @property string      $name
 * @property string      $code          Short lab code (e.g. FBC, MALRDT)
 * @property string      $category      haematology|biochemistry|microbiology|immunology|urinalysis|parasitology|other
 * @property string|null $description
 * @property float       $price
 * @property int         $turnaround_minutes  Expected TAT in minutes
 * @property bool        $is_active
 */
final class LabTest extends Model
{
    use SoftDeletes;

    protected $table = 'lab_tests';

    /** @var array<int, string> */
    protected $fillable = [
        'name', 'code', 'category', 'description',
        'price', 'turnaround_minutes', 'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'price'               => 'float',
        'turnaround_minutes'  => 'integer',
        'is_active'           => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(LabOrder::class, 'lab_test_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Radiology\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents an imaging study type in the radiology catalog.
 * E.g., "Chest X-Ray PA", "Abdominal Ultrasound", "Brain MRI".
 *
 * @property int         $id
 * @property string      $name
 * @property string      $code             Short code (e.g., CXR-PA, ABD-US)
 * @property string      $modality         xray|ultrasound|ct|mri|fluoroscopy|mammography|other
 * @property string      $body_part
 * @property string|null $description
 * @property string|null $preparation      Patient preparation instructions
 * @property float       $price
 * @property int         $turnaround_minutes
 * @property bool        $requires_contrast
 * @property bool        $is_active
 */
final class ImagingStudy extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_studies';

    /** @var array<int, string> */
    protected $fillable = [
        'name', 'code', 'modality', 'body_part', 'description',
        'preparation', 'price', 'turnaround_minutes',
        'requires_contrast', 'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'price'               => 'float',
        'turnaround_minutes'  => 'integer',
        'requires_contrast'   => 'boolean',
        'is_active'           => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(ImagingOrder::class, 'imaging_study_id');
    }
}

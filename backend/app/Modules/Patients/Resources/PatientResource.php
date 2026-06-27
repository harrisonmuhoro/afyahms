<?php

declare(strict_types=1);

namespace App\Modules\Patients\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Patient JSON resource. Externally exposed via `public_id` (UUID);
 * the BIGINT `id` is kept internal.
 *
 * Supports sparse fieldsets via the API spec — only requested attributes
 * are included when `?fields[patient]=` is supplied.
 *
 * @property-read \App\Modules\Patients\Models\Patient $resource
 */
final class PatientResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $patient = $this->resource;
        $requested = (array) $request->query('fields.patient', []);

        $all = [
            'id'                  => $patient->public_id,
            'internal_id'         => (int) $patient->id,
            'patient_number'      => $patient->patient_number,
            'first_name'          => $patient->first_name,
            'middle_name'         => $patient->middle_name,
            'last_name'           => $patient->last_name,
            'full_name'           => $patient->fullName(),
            'gender'              => $patient->gender,
            'marital_status'      => $patient->marital_status,
            'date_of_birth'       => $patient->date_of_birth?->toDateString(),
            'age'                 => $patient->ageYears(),
            'blood_group'         => $patient->blood_group,
            'phone'               => $patient->phone,
            'email'               => $patient->email,
            'national_id'         => $patient->national_id,
            'sha_number'          => $patient->sha_number,
            'county'              => $patient->county,
            'sub_county'          => $patient->sub_county,
            'address'             => $patient->address,
            'occupation'          => $patient->occupation,
            'photo_path'          => $patient->photo_path,
            'deceased'            => (bool) $patient->deceased,
            'deceased_at'         => $patient->deceased_at?->toDateString(),
            'branch_id'           => (int) $patient->branch_id,
            'is_active'           => (bool) $patient->is_active,
            'merged_into'         => $patient->merged_into_public_id,
            'merged_at'           => $patient->merged_at?->toIso8601String(),
            'registered_by'       => $patient->registered_by,
            'created_at'          => $patient->created_at?->toIso8601String(),
            'updated_at'          => $patient->updated_at?->toIso8601String(),
        ];

        if ($requested === []) {
            return $all;
        }

        return array_intersect_key($all, array_flip($requested));
    }
}
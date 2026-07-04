<?php

declare(strict_types=1);

namespace App\Modules\Patients\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global Eloquent scope that auto-filters queries by `patient_id` if the 
 * authenticated user is a patient.
 */
final class OwnPatientDataScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (Auth::hasUser() && Auth::user()->hasRole('patient')) {
            $patientId = Auth::user()->patient_id;
            
            // If the user is a patient but doesn't have a linked patient_id, 
            // return empty set defensively
            if ($patientId === null) {
                $builder->whereRaw('1 = 0');
                return;
            }

            $builder->where($model->qualifyColumn('patient_id'), $patientId);
        }
    }
}

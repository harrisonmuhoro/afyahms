<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Eloquent;

use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * @extends EloquentRepository<Patient>
 */
final class EloquentPatientRepository extends EloquentRepository implements PatientRepository
{
    protected string $modelClass = Patient::class;

    public function findById(int $id): ?Patient
    {
        /** @var Patient|null */
        return $this->newQuery()->find($id);
    }

    public function findByPublicId(string $publicId): ?Patient
    {
        /** @var Patient|null */
        return $this->newQuery()->where('public_id', $publicId)->first();
    }

    public function findByPatientNumber(string $patientNumber): ?Patient
    {
        /** @var Patient|null */
        return $this->newQuery()->where('patient_number', $patientNumber)->first();
    }

    public function search(string $query, int $limit = 10): Collection
    {
        $needle = trim($query);
        if ($needle === '') {
            return collect();
        }

        $like = '%'.$needle.'%';

        return $this->newQuery()
            ->where(function (Builder $q) use ($like, $needle) {
                $q->where('patient_number', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", [$like])
                    ->orWhereRaw("CONCAT(first_name, ' ', COALESCE(middle_name,''), ' ', last_name) LIKE ?", [$like]);
            })
            ->whereNull('merged_at')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit($limit)
            ->get();
    }

    public function paginate(array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $query = $this->newQuery()->whereNull('merged_at');

        if (isset($filters['gender']) && $filters['gender'] !== '') {
            $query->where('gender', $filters['gender']);
        }
        if (isset($filters['blood_group']) && $filters['blood_group'] !== '') {
            $query->where('blood_group', $filters['blood_group']);
        }
        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $query->where('is_active', (bool) $filters['is_active']);
        }
        if (isset($filters['created_between']) && $filters['created_between'] !== '') {
            [$from, $to] = array_pad(explode(',', (string) $filters['created_between'], 2), 2, null);
            if ($from !== null && $from !== '') {
                $query->whereDate('created_at', '>=', $from);
            }
            if ($to !== null && $to !== '') {
                $query->whereDate('created_at', '<=', $to);
            }
        }
        if (isset($filters['search']) && $filters['search'] !== '') {
            $needle = (string) $filters['search'];
            $like = '%'.$needle.'%';
            $query->where(function (Builder $q) use ($like) {
                $q->where('patient_number', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('phone', 'like', $like);
            });
        }

        $sort = (string) ($filters['sort'] ?? '-created_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        if (! in_array($column, ['created_at', 'last_name', 'first_name', 'patient_number'], true)) {
            $column = 'created_at';
            $direction = 'desc';
        }
        $query->orderBy($column, $direction);

        return $query->paginate($perPage);
    }

    public function findPotentialDuplicates(Patient $candidate): Collection
    {
        $query = $this->newQuery()->whereNull('merged_at');

        $query->where(function (Builder $q) use ($candidate) {
            // National ID exact match — strong signal
            if ($candidate->national_id !== null && $candidate->national_id !== '') {
                $q->orWhere('national_id', $candidate->national_id);
            }

            // Phone exact match
            if ($candidate->phone !== null && $candidate->phone !== '') {
                $q->orWhere('phone', $candidate->phone);
            }

            // Name + DOB fuzzy — same person, different phone/ID
            if ($candidate->date_of_birth !== null) {
                $q->orWhere(function (Builder $nested) use ($candidate) {
                    $nested->where('first_name', 'like', $this->normalizeName($candidate->first_name))
                        ->where('last_name', 'like', $this->normalizeName($candidate->last_name))
                        ->whereDate('date_of_birth', $candidate->date_of_birth);
                });
            }
        });

        return $query->limit(10)->get();
    }

    public function create(array $attributes): EloquentModel
    {
        /** @var Patient */
        return $this->newQuery()->create($attributes);
    }

    public function update(EloquentModel $model, array $attributes): EloquentModel
    {
        $model->update($attributes);

        return $model;
    }

    public function softMerge(Patient $source, Patient $target): void
    {
        // Stamp the source — never delete clinical data per Foundation §11.
        $source->forceFill([
            'merged_into_public_id' => $target->public_id,
            'merged_at'             => now(),
            'is_active'             => false,
        ])->saveQuietly();
    }

    private function normalizeName(string $value): string
    {
        return '%'.Str::lower(Str::ascii($value)).'%';
    }
}
<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Resources\PatientResource;
use App\Modules\Patients\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lightweight typeahead search for the patient picker. Returns only the
 * fields the autocomplete UI needs; full record is fetched via
 * `GET /patients/{uuid}`.
 */
final class PatientSearchController extends Controller
{
    public function __construct(private readonly PatientService $service) {}

    public function __invoke(Request $request): JsonResponse
    {
        $query = trim((string) $request->string('q'));
        $limit = (int) min(50, max(1, (int) $request->integer('limit', 10)));

        if ($query === '') {
            return response()->json(['data' => []]);
        }

        $results = $this->service->search($query, $limit);

        return response()->json([
            'data' => $results->map(fn ($p) => [
                'id'             => $p->public_id,
                'patient_number' => $p->patient_number,
                'full_name'      => $p->fullName(),
                'phone'          => $p->phone,
                'dob'            => $p->date_of_birth?->toDateString(),
                'age'            => $p->ageYears(),
                'gender'         => $p->gender,
            ])->values(),
        ]);
    }
}
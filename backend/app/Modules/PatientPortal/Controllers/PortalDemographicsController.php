<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Exceptions\Domain\ForbiddenException;
use App\Http\Controllers\Controller;
use App\Modules\Patients\Resources\PatientResource;
use App\Modules\Patients\Services\PatientService;
use App\Modules\PatientPortal\Requests\UpdateOwnDemographicsRequest;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Hash;

final class PortalDemographicsController extends Controller
{
    public function __construct(private readonly PatientService $patients) {}

    public function update(UpdateOwnDemographicsRequest $request): JsonResource
    {
        $user = $request->user();
        $patient = $user?->patient;
        if ($patient === null) {
            throw new ForbiddenException('No patient record is linked to this account.');
        }

        if (!empty($user->password)) {
            $request->validate([
                'current_password' => ['required', 'string'],
            ]);

            if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
                throw new ForbiddenException('Confirm your current password before editing demographic data.');
            }
        }

        $updated = $this->patients->update($patient, $request->validated(), $user, $request);

        return new PatientResource($updated);
    }
}

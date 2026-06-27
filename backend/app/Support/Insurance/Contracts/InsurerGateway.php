<?php

declare(strict_types=1);

namespace App\Support\Insurance\Contracts;

use App\Modules\Insurance\Data\EligibilityData;
use App\Modules\Insurance\Data\ClaimSubmissionData;
use App\Modules\Insurance\Data\ClaimStatusData;

interface InsurerGateway
{
    public function name(): string;

    public function isEnabled(): bool;

    public function verifyEligibility(string $memberNumber, ?string $nationalId = null): EligibilityData;

    public function submitClaim(ClaimSubmissionData $claim): ClaimSubmissionResult;

    public function status(string $claimNumber): ClaimStatusData;

    public function preAuth(ClaimSubmissionData $request): ClaimSubmissionResult;
}
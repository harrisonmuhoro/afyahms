<?php

declare(strict_types=1);

namespace App\Modules\Patients\Dto;

use Spatie\LaravelData\Data;

/**
 * Service-layer DTO for creating / updating a patient. Validated by
 * FormRequest at the boundary; the service then guarantees the patient
 * row is created/updated exactly once per request.
 */
final class PatientDto extends Data
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $firstName,
        public readonly ?string $middleName,
        public readonly string $lastName,
        public readonly ?string $nationalId,
        public readonly ?string $shaNumber,
        public readonly ?string $dateOfBirth,
        public readonly string $gender,
        public readonly string $maritalStatus,
        public readonly string $bloodGroup,
        public readonly ?string $phone,
        public readonly ?string $email,
        public readonly ?string $county,
        public readonly ?string $subCounty,
        public readonly ?string $address,
        public readonly ?string $occupation,
        public readonly ?string $photoPath,
        public readonly bool $isActive,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromArray(array $payload): self
    {
        return new self(
            id: isset($payload['id']) ? (int) $payload['id'] : null,
            firstName: trim((string) ($payload['first_name'] ?? '')),
            middleName: isset($payload['middle_name']) && $payload['middle_name'] !== ''
                ? trim((string) $payload['middle_name']) : null,
            lastName: trim((string) ($payload['last_name'] ?? '')),
            nationalId: $payload['national_id'] ?? null,
            shaNumber: $payload['sha_number'] ?? null,
            dateOfBirth: $payload['date_of_birth'] ?? null,
            gender: (string) ($payload['gender'] ?? 'unknown'),
            maritalStatus: (string) ($payload['marital_status'] ?? 'unknown'),
            bloodGroup: (string) ($payload['blood_group'] ?? 'unknown'),
            phone: $payload['phone'] ?? null,
            email: $payload['email'] ?? null,
            county: $payload['county'] ?? null,
            subCounty: $payload['sub_county'] ?? null,
            address: $payload['address'] ?? null,
            occupation: $payload['occupation'] ?? null,
            photoPath: $payload['photo_path'] ?? null,
            isActive: (bool) ($payload['is_active'] ?? true),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toModelAttributes(int $branchId, ?int $registeredBy): array
    {
        return [
            'branch_id'      => $branchId,
            'first_name'     => $this->firstName,
            'middle_name'    => $this->middleName,
            'last_name'      => $this->lastName,
            'national_id'    => $this->nationalId,
            'sha_number'     => $this->shaNumber,
            'date_of_birth'  => $this->dateOfBirth,
            'gender'         => $this->gender,
            'marital_status' => $this->maritalStatus,
            'blood_group'    => $this->bloodGroup,
            'phone'          => $this->phone,
            'email'          => $this->email,
            'county'         => $this->county,
            'sub_county'     => $this->subCounty,
            'address'        => $this->address,
            'occupation'     => $this->occupation,
            'photo_path'     => $this->photoPath,
            'is_active'      => $this->isActive,
            'registered_by'  => $registeredBy,
        ];
    }
}
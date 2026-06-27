<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Patient deduplication heuristics — supports the API spec §4.3
 * `POST /patients` dedupe pre-check, which must surface
 * `409 PATIENT_DUPLICATE` (with `meta.candidates[]`) unless the caller
 * passed `dedupe_override: true`.
 *
 * The dedupe signals are scored and the highest-signal match is treated
 * as a duplicate. Tier-1 (national_id OR phone exact) is a hard duplicate;
 * Tier-2 (name + DOB) is a soft duplicate that the operator must review.
 */
final class DedupeMatcher
{
    public function __construct(private readonly PatientRepository $patients) {}

    /**
     * @return Collection<int, array{patient: Patient, score: int, tier: string, signals: array<int, string>}>
     */
    public function candidatesFor(array $candidate): Collection
    {
        $probe = new Patient([
            'first_name'    => (string) ($candidate['first_name'] ?? ''),
            'last_name'     => (string) ($candidate['last_name'] ?? ''),
            'national_id'   => $candidate['national_id'] ?? null,
            'phone'         => $candidate['phone'] ?? null,
            'date_of_birth' => $candidate['date_of_birth'] ?? null,
        ]);

        $candidates = $this->patients->findPotentialDuplicates($probe);

        return $candidates
            ->map(function (Patient $candidate) use ($probe) {
                $signals = [];
                $score = 0;

                if ($this->bothPresent($probe->national_id, $candidate->national_id)
                    && hash_equals((string) $probe->national_id, (string) $candidate->national_id)) {
                    $signals[] = 'national_id';
                    $score += 100;
                }

                if ($this->bothPresent($probe->phone, $candidate->phone)
                    && $this->normalizePhone((string) $probe->phone) === $this->normalizePhone((string) $candidate->phone)) {
                    $signals[] = 'phone';
                    $score += 80;
                }

                if ($probe->date_of_birth !== null && $candidate->date_of_birth !== null
                    && $probe->date_of_birth->isSameDay($candidate->date_of_birth)
                    && $this->nameMatches($probe, $candidate)) {
                    $signals[] = 'name+dob';
                    $score += 50;
                }

                if ($score === 0) {
                    return null;
                }

                $tier = $score >= 80 ? 'hard' : 'soft';

                return ['patient' => $candidate, 'score' => $score, 'tier' => $tier, 'signals' => $signals];
            })
            ->filter()
            ->values()
            ->sortByDesc('score');
    }

    private function bothPresent(mixed $a, mixed $b): bool
    {
        return $a !== null && $a !== '' && $b !== null && $b !== '';
    }

    private function normalizePhone(string $phone): string
    {
        // Strip everything except digits, then drop leading country-code 254 or 0
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '254')) {
            $digits = substr($digits, 3);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return $digits;
    }

    private function nameMatches(Patient $a, Patient $b): bool
    {
        $first = fn (string $value): string => Str::lower(Str::ascii(trim($value)));
        $f1 = $first((string) $a->first_name);
        $f2 = $first((string) $b->first_name);
        $l1 = $first((string) $a->last_name);
        $l2 = $first((string) $b->last_name);

        // exact full match, OR last-name + first initial
        if ($f1 === $f2 && $l1 === $l2) {
            return true;
        }
        if ($l1 === $l2 && $f1 !== '' && $f2 !== '' && $f1[0] === $f2[0]) {
            return true;
        }

        return false;
    }
}
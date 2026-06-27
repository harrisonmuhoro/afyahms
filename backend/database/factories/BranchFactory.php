<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Branch>
 */
final class BranchFactory extends Factory
{
    protected $model = Branch::class;

    public function definition(): array
    {
        $code = strtoupper(Str::random(3));

        return [
            'public_id' => fake()->uuid(),
            'code'      => $code,
            'name'      => $code.' Branch',
            'address'   => fake()->streetAddress(),
            'phone'     => '+2547'.fake()->numerify('########'),
            'email'     => fake()->companyEmail(),
            'timezone'  => 'Africa/Nairobi',
            'currency'  => 'KES',
            'is_active' => true,
        ];
    }
}
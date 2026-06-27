<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
final class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'public_id'   => fake()->uuid(),
            'name'        => fake()->name(),
            'email'       => fake()->unique()->safeEmail(),
            'phone'       => '+2547'.fake()->numerify('########'),
            'password'    => Hash::make('ChangeMe!2025'),
            'home_branch_id'    => Branch::inRandomOrder()->value('id'),
            'current_branch_id' => Branch::inRandomOrder()->value('id'),
            'mfa_enabled' => false,
        ];
    }

    public function withMfa(): self
    {
        return $this->state(fn () => [
            'mfa_enabled'      => true,
            'mfa_confirmed_at' => now(),
        ]);
    }
}
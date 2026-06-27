<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Console;

use App\Modules\Tenancy\Services\BranchService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * One-off helper to create a branch from the CLI:
 *   php artisan branches:create --code=KSM --name="Kisumu Branch" --shortcode=174379
 */
final class CreateBranchCommand extends Command
{
    protected $signature = 'branches:create
        {--code= : 2-8 letter uppercase code, e.g. NRB}
        {--name= : Display name}
        {--address= : Address (optional)}
        {--phone= : Phone (optional)}
        {--shortcode= : M-Pesa shortcode (optional)}';

    protected $description = 'Create a new branch.';

    public function handle(BranchService $branches): int
    {
        $code = strtoupper((string) $this->option('code'));
        $name = (string) $this->option('name');

        if ($code === '' || ! preg_match('/^[A-Z]{2,8}$/', $code)) {
            $this->error('Invalid code (must be 2-8 uppercase letters).');

            return self::FAILURE;
        }

        if ($name === '') {
            $this->error('Name is required.');

            return self::FAILURE;
        }

        if (\App\Modules\Tenancy\Models\Branch::findByCode($code) !== null) {
            $this->warn("Branch '{$code}' already exists.");

            return self::SUCCESS;
        }

        $branch = $branches->create([
            'code'             => $code,
            'name'             => $name,
            'address'          => $this->option('address') ?: null,
            'phone'            => $this->option('phone') ?: null,
            'mpesa_shortcode'  => $this->option('shortcode') ?: null,
            'public_id'        => (string) Str::uuid(),
            'is_active'        => true,
            'timezone'         => 'Africa/Nairobi',
            'currency'         => 'KES',
        ]);

        $this->info("Created branch {$branch->code} (id={$branch->id}).");

        return self::SUCCESS;
    }
}
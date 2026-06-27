<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\CreatesApplication;

abstract class TestCase extends BaseTestCase
{
    use \Tests\CreatesApplication;

    /**
     * Default actor: a hospital-admin user with all branches access.
     * Tests can $this->actingAs($user) with their own user.
     */
    protected function adminUser(array $overrides = []): \App\Models\User
    {
        return \App\Models\User::factory()->create(array_merge([
            'name'  => 'Test Admin',
            'email' => 'admin+'.uniqid().'@afya.local',
        ], $overrides));
    }
}
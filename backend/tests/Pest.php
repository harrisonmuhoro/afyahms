<?php

declare(strict_types=1);

use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature', 'Unit', 'Integration');

/*
|--------------------------------------------------------------------------
| Architecture tests
|--------------------------------------------------------------------------
| Foundation §2 — module isolation. These tests assert that modules do
| NOT reach into each other's internal namespaces.
*/

pest()->extend(Tests\TestCase::class)
    ->in('Architecture');

uses()
    ->beforeEach(function () {
        // Ensure cached permissions are reset between arch tests
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    })
    ->in('Architecture');
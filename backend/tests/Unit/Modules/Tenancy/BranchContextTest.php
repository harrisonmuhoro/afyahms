<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Tenancy;

use App\Modules\Tenancy\Services\BranchContext;
use Tests\TestCase;

final class BranchContextTest extends TestCase
{
    public function test_default_branch_is_null(): void
    {
        $ctx = app(BranchContext::class);
        $this->assertNull($ctx->get());
    }

    public function test_set_and_get_roundtrip(): void
    {
        /** @var BranchContext $ctx */
        $ctx = app(BranchContext::class);
        $ctx->set(42);
        $this->assertSame(42, $ctx->get());
        $this->assertTrue($ctx->has());
    }

    public function test_require_throws_when_unset(): void
    {
        /** @var BranchContext $ctx */
        $ctx = app(BranchContext::class);
        $this->expectException(\App\Exceptions\Domain\ValidationFailedException::class);
        $ctx->require();
    }
}
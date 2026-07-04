<?php

declare(strict_types=1);

namespace App\Modules\Patients\Traits;

use App\Modules\Patients\Scopes\OwnPatientDataScope;

trait HasOwnPatientDataScope
{
    /**
     * Boot the trait and apply the scope.
     */
    protected static function bootHasOwnPatientDataScope(): void
    {
        static::addGlobalScope(new OwnPatientDataScope());
    }
}

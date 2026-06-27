<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Branches / Tenancy configuration
    |--------------------------------------------------------------------------
    */

    'home_branch_required' => true,

    /*
    | The default branch code used in development seeders.
    */
    'default_seed_branch' => [
        'code' => 'NRB',
        'name' => 'Nairobi (HQ)',
    ],

    /*
    | Whether new users default to a single branch or are granted multiple.
    */
    'user_multi_branch_default' => false,
];
<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Sequence service (foundation §6)
    |--------------------------------------------------------------------------
    | Sole writer of the `sequences` table. Uses SELECT ... FOR UPDATE
    | inside a DB transaction to allocate gap-tolerant identifiers.
    */

    'table' => 'sequences',

    /*
    | Lock timeout in seconds. MySQL default = 50s innodb_lock_wait_timeout.
    */
    'lock_timeout_seconds' => 5,

    /*
    | Audit every sequence allocation (debug-grade; set false in extreme hot paths).
    */
    'audit' => true,
];
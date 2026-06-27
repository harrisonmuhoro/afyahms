<?php

declare(strict_types=1);

return [
    'enabled' => env('ACTIVITYLOG_ENABLED', true),
    'delete_records_using' => [
        'model' => \Spatie\Activitylog\Models\Activity::class,
        'observer' => null,
        'soft_deletes' => true,
        'use_deleted_at' => true,
        'logs_table' => 'activity_log',
    ],
    'activity_model' => \Spatie\Activitylog\Models\Activity::class,
    'activity_table' => 'activity_log',
    'activity_log_database_connection' => env('ACTIVITY_LOG_DB_CONNECTION'),
    'table_name' => 'activity_log',
    'database_connection' => env('ACTIVITY_LOG_DB_CONNECTION'),
    'causer_model' => env('ACTIVITY_LOG_CAUSER_MODEL', \App\Models\User::class),
    'subject_model' => env('ACTIVITY_LOG_SUBJECT_MODEL'),
    'activity_subject_returns_model_type' => true,
    'empty_log_entry_handling' => 'discard',
    'minimum_log_level' => env('ACTIVITYLOG_MIN_LEVEL', 'debug'),
    'log_unsuccessful_login_attempts' => true,
    'default_auth_driver' => 'web',
    'default_log_name' => 'default',
    'default_auth_driver_for_login' => 'web',
    'batch_uuid_as_primary_key' => false,
    'auth_driver_for_login' => 'web',
];
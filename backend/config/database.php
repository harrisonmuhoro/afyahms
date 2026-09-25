<?php

declare(strict_types=1);

$mysqlSslCaAttribute = defined('Pdo\\Mysql::ATTR_SSL_CA')
    ? constant('Pdo\\Mysql::ATTR_SSL_CA')
    : PDO::MYSQL_ATTR_SSL_CA;

return [
    'default' => env('DB_CONNECTION', 'mysql'),

    'connections' => [
        'mysql' => [
            'driver'      => 'mysql',
            'url'         => env('DB_URL'),
            'host'        => env('DB_HOST', '127.0.0.1'),
            'port'        => env('DB_PORT', '3306'),
            'database'    => env('DB_DATABASE', 'afya'),
            'username'    => env('DB_USERNAME', 'afya'),
            'password'    => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset'     => env('DB_CHARSET', 'utf8mb4'),
            'collation'   => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix'      => '',
            'prefix_indexes' => true,
            'strict'      => true,
            'engine'      => 'InnoDB',
            'options'     => extension_loaded('pdo_mysql') ? array_filter([
                $mysqlSslCaAttribute => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],

        'mysql_read' => [
            'driver'   => 'mysql',
            'host'     => env('DB_READ_HOST', env('DB_HOST', '127.0.0.1')),
            'port'     => env('DB_READ_PORT', env('DB_PORT', '3306')),
            'database' => env('DB_DATABASE', 'afya'),
            'username' => env('DB_USERNAME', 'afya'),
            'password' => env('DB_PASSWORD', ''),
            'charset'     => 'utf8mb4',
            'collation'   => 'utf8mb4_unicode_ci',
            'strict'      => true,
            'engine'      => 'InnoDB',
        ],
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    'redis' => [
        'client'  => env('REDIS_CLIENT', 'phpredis'),
        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix'  => env('REDIS_PREFIX', 'afya_'),
        ],
        'default' => [
            'url'      => env('REDIS_URL'),
            'host'     => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port'     => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],
        'cache' => [
            'url'      => env('REDIS_URL'),
            'host'     => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port'     => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
        ],
    ],
];

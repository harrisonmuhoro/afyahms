-- MySQL init scripts for Afya HMS
-- This runs ON FIRST START of a fresh MySQL container.
-- Use it to set character set + timezone, NOT to create app tables (those are Laravel migrations).

SET GLOBAL time_zone = '+03:00';
SET GLOBAL character_set_server = 'utf8mb4';
SET GLOBAL collation_server = 'utf8mb4_unicode_ci';

-- Create app database (already created by MYSQL_DATABASE env, but kept for explicit clarity).
CREATE DATABASE IF NOT EXISTS `afya`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `afya_test`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `afya`.* TO 'afya'@'%';
GRANT ALL PRIVILEGES ON `afya_test`.* TO 'afya'@'%';
FLUSH PRIVILEGES;
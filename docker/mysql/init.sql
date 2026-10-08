-- B1-08 — MySQL local init (dev/test only).
-- Creates the ephemeral test database alongside the dev database so
-- `php artisan test` can target a throwaway schema without touching dev data.
-- No seed data, no secrets.
CREATE DATABASE IF NOT EXISTS `hrms_test`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- grant the dev user full rights on the test db too (dev-only user).
GRANT ALL PRIVILEGES ON `hrms_test`.* TO 'hrms'@'%';
FLUSH PRIVILEGES;

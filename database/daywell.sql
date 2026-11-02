-- Daywell: fresh database import for XAMPP MySQL / MariaDB.
-- Import this file from phpMyAdmin > Import.
-- No DROP or TRUNCATE statements. Existing tables/accounts are not overwritten.
-- For an older Daywell database, use npm run db:init to upgrade it instead.
CREATE DATABASE IF NOT EXISTS `daywell` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `daywell`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
 `id` INT PRIMARY KEY,
 `name` VARCHAR(100) NOT NULL DEFAULT 'Alex',
 `email` VARCHAR(254) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO `settings` (`id`) VALUES (1);

CREATE TABLE IF NOT EXISTS `users` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `name` VARCHAR(100) NOT NULL,
 `email` VARCHAR(254) NOT NULL UNIQUE,
 `custom_currencies` JSON NULL,
 `home_currency` VARCHAR(40) NOT NULL DEFAULT 'USD',
 `current_rate` DECIMAL(13,6) NULL,
 `last_currency` VARCHAR(40) NOT NULL DEFAULT 'USD',
 `reminder_email` VARCHAR(254) NOT NULL DEFAULT '',
 `password_hash` VARCHAR(200) NOT NULL,
 `role` ENUM('admin','user') NOT NULL DEFAULT 'user',
 `permissions` JSON NOT NULL,
 `active` BOOLEAN NOT NULL DEFAULT TRUE,
 `last_seen_at` DATETIME NULL,
 `last_login_at` DATETIME NULL,
 `login_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
 `quiet_start` VARCHAR(5) NOT NULL DEFAULT '',
 `quiet_end` VARCHAR(5) NOT NULL DEFAULT '',
 `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
 `token_hash` CHAR(64) PRIMARY KEY,
 `user_id` INT NOT NULL,
 `expires_at` DATETIME NOT NULL,
 INDEX (`user_id`), INDEX (`expires_at`),
 FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `entries` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `currency` VARCHAR(40) NOT NULL DEFAULT 'USD',
 `exchange_rate` DECIMAL(13,6) NULL,
 `rate_snapshot` JSON NULL,
 `type` ENUM('income','opening','expense','withdrawal') NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `amount` DECIMAL(12,2) NOT NULL,
 `saved` DECIMAL(12,2) NOT NULL DEFAULT 0,
 `category` VARCHAR(80) NOT NULL DEFAULT 'Other',
 `date` DATE NOT NULL,
 `note` TEXT NOT NULL,
 `voided_on` DATE NULL,
 `void_reason` VARCHAR(500) NOT NULL DEFAULT '',
 `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX (`user_id`), INDEX (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `items` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `amount` DECIMAL(12,2) NOT NULL,
 `category` VARCHAR(80) NOT NULL,
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `budgets` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `amount` DECIMAL(12,2) NOT NULL,
 `start` DATE NOT NULL,
 `end` DATE NOT NULL,
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscriptions` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `amount` DECIMAL(12,2) NOT NULL,
 `cycle` ENUM('weekly','monthly','yearly') NOT NULL,
 `renewal` DATE NOT NULL,
 `category` VARCHAR(80) NOT NULL,
 `active` BOOLEAN NOT NULL DEFAULT TRUE,
 `rarely_used` BOOLEAN NOT NULL DEFAULT FALSE,
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `category` VARCHAR(80) NOT NULL DEFAULT 'Personal',
 `due` DATE NOT NULL,
 `scheduled_time` VARCHAR(5) NULL,
 `cancelled` BOOLEAN NOT NULL DEFAULT FALSE,
 `estimate_minutes` INT NOT NULL DEFAULT 0,
 `priority` ENUM('low','medium','high') NOT NULL,
 `note` TEXT NOT NULL,
 `reminder` DATE NULL,
 `completed` BOOLEAN NOT NULL DEFAULT FALSE,
 `completed_on` DATE NULL,
 `recurrence` ENUM('none','daily','weekly') NOT NULL DEFAULT 'none',
 `previous_task_id` INT NULL,
 UNIQUE KEY `unique_previous_task` (`previous_task_id`),
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subtasks` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `task_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `completed` BOOLEAN NOT NULL DEFAULT FALSE,
 INDEX (`user_id`), INDEX (`task_id`),
 FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goals` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `title` VARCHAR(160) NOT NULL,
 `target_amount` DECIMAL(12,2) NOT NULL,
 `target_date` DATE NULL,
 `monthly_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goal_moves` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `goal_id` INT NOT NULL,
 `kind` ENUM('fund','release') NOT NULL,
 `amount` DECIMAL(12,2) NOT NULL,
 `note` VARCHAR(500) NOT NULL DEFAULT '',
 `date` DATE NOT NULL,
 INDEX (`user_id`), INDEX (`goal_id`),
 FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `day_plans` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `date` DATE NOT NULL,
 `energy` ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
 `top_ids` JSON NOT NULL,
 `went_well` TEXT NOT NULL,
 `tomorrow_help` TEXT NOT NULL,
 `closed_at` VARCHAR(30) NULL,
 UNIQUE KEY `user_day` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inbox` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `user_id` INT NOT NULL,
 `text` VARCHAR(1000) NOT NULL,
 `date` DATE NOT NULL,
 `archived` BOOLEAN NOT NULL DEFAULT FALSE,
 `task_id` INT NULL,
 INDEX (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reminder_log` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `reminder_key` VARCHAR(200) NOT NULL UNIQUE,
 `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Creates one initial administrator only when no admin or matching email exists.
CREATE TABLE IF NOT EXISTS `companion_usage` (
 `scope` VARCHAR(100) PRIMARY KEY,
 `requests` INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Creates one initial administrator only when no admin or matching email exists.
-- Login details are in ADMIN-CREDENTIALS.local.txt, alongside this file.
INSERT INTO users (name,email,reminder_email,password_hash,role,permissions,active)
SELECT 'Administrator','admin@daywell.local','','scrypt:47feda2b86b5ae1aefaa6dc7576263ea:d114c7fcad748d7bcf71158708b5d4a19649d672ef4cb3f7cbe6a948817b1df6aa46330e9ad042532bcc8735fd4f8f467d0621e396d0e48bd3afd9653c5f694d','admin','["money","tasks","assistant"]',1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin' OR email='admin@daywell.local');


CREATE TABLE IF NOT EXISTS `password_resets` (
 `token_hash` CHAR(64) PRIMARY KEY,
 `user_id` INT NOT NULL UNIQUE,
 `expires_at` DATETIME NOT NULL,
 FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

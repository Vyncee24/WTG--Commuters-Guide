-- =============================================================================
-- WTG: Commuters Guide — OLTP + OLAP Migration
-- =============================================================================
-- Run this file ONCE against your running MySQL server:
--   mysql -u root -p < migrations/add_oltp_olap.sql
-- Or from MySQL shell:
--   SOURCE /path/to/migrations/add_oltp_olap.sql;
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE `wtg_commuters_guide`;

-- -----------------------------------------------------------------------------
-- PHASE 1 — OLTP: search_count column on routes
-- -----------------------------------------------------------------------------
ALTER TABLE `routes`
  ADD COLUMN IF NOT EXISTS `search_count` INT NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- PHASE 1 — OLTP: search_history table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `search_history` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `user_id`     INT               NULL,
  `route_id`    VARCHAR(100)      NULL,
  `origin`      VARCHAR(100)  NOT NULL,
  `destination` VARCHAR(100)  NOT NULL,
  `searched_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sh_user`        (`user_id`),
  KEY `idx_sh_route`       (`route_id`),
  KEY `idx_sh_searched_at` (`searched_at`),
  CONSTRAINT `fk_sh_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- PHASE 3 — OLAP: Star Schema in separate database commuter_olap
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `commuter_olap`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `commuter_olap`;

-- -----------------------------------------------------------------------------
-- DIMENSION: dim_date
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dim_date` (
  `date_key`  INT         NOT NULL,   -- YYYYMMDD integer surrogate key
  `full_date` DATE        NOT NULL,
  `day`       TINYINT     NOT NULL,
  `month`     TINYINT     NOT NULL,
  `quarter`   TINYINT     NOT NULL,
  `year`      SMALLINT    NOT NULL,
  PRIMARY KEY (`date_key`),
  UNIQUE KEY `uq_dim_date_full` (`full_date`),
  KEY `idx_dim_date_year_month` (`year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- DIMENSION: dim_route
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dim_route` (
  `route_key`   INT          NOT NULL AUTO_INCREMENT,
  `route_id`    VARCHAR(100) NOT NULL,
  `origin`      VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`route_key`),
  UNIQUE KEY `uq_dim_route_id` (`route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- DIMENSION: dim_user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dim_user` (
  `user_key` INT          NOT NULL AUTO_INCREMENT,
  `user_id`  INT          NOT NULL,
  `role`     VARCHAR(20)  NOT NULL DEFAULT 'user',
  PRIMARY KEY (`user_key`),
  UNIQUE KEY `uq_dim_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- FACT TABLE: fact_route_usage
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fact_route_usage` (
  `fact_id`        INT     NOT NULL AUTO_INCREMENT,
  `date_key`       INT     NOT NULL,
  `route_key`      INT     NOT NULL,
  `user_key`       INT         NULL,
  `search_count`   INT     NOT NULL DEFAULT 0,
  `save_count`     INT     NOT NULL DEFAULT 0,
  `average_rating` DECIMAL(3,2)  NULL,
  PRIMARY KEY (`fact_id`),
  UNIQUE KEY `uq_fact_date_route_user` (`date_key`, `route_key`, `user_key`),
  KEY `idx_fact_date_key`  (`date_key`),
  KEY `idx_fact_route_key` (`route_key`),
  KEY `idx_fact_user_key`  (`user_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Pre-populate dim_date for 2020–2030 (quick calendar seed)
-- =============================================================================
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS fill_dim_date(p_start DATE, p_end DATE)
BEGIN
  DECLARE v_date DATE DEFAULT p_start;
  WHILE v_date <= p_end DO
    INSERT IGNORE INTO dim_date (date_key, full_date, day, month, quarter, year)
    VALUES (
      CAST(DATE_FORMAT(v_date, '%Y%m%d') AS UNSIGNED),
      v_date,
      DAY(v_date),
      MONTH(v_date),
      QUARTER(v_date),
      YEAR(v_date)
    );
    SET v_date = DATE_ADD(v_date, INTERVAL 1 DAY);
  END WHILE;
END$$
DELIMITER ;

CALL fill_dim_date('2020-01-01', '2030-12-31');
DROP PROCEDURE IF EXISTS fill_dim_date;

-- =============================================================================
-- SAMPLE OLAP QUERIES (for documentation / reference)
-- =============================================================================

-- ROLL-UP: Day → Month → Year search totals
-- SELECT d.year, d.month, d.day, SUM(f.search_count) AS total_searches
-- FROM fact_route_usage f
-- JOIN dim_date d ON d.date_key = f.date_key
-- GROUP BY d.year, d.month, d.day WITH ROLLUP
-- ORDER BY d.year, d.month, d.day;

-- DRILL-DOWN: Year → Month → Day for a specific route
-- SELECT d.year, d.month, d.day, SUM(f.search_count) AS total
-- FROM fact_route_usage f
-- JOIN dim_date d ON d.date_key = f.date_key
-- JOIN dim_route r ON r.route_key = f.route_key
-- WHERE r.destination = 'SM Tanza'
-- GROUP BY d.year, d.month, d.day
-- ORDER BY d.year, d.month, d.day;

-- SLICE: destination = 'SM Tanza'
-- SELECT r.origin, r.destination, d.full_date,
--        f.search_count, f.save_count, f.average_rating
-- FROM fact_route_usage f
-- JOIN dim_route r ON r.route_key = f.route_key
-- JOIN dim_date  d ON d.date_key  = f.date_key
-- WHERE r.destination = 'SM Tanza'
-- ORDER BY d.full_date;

-- DICE: destination='SM Tanza' AND month=June AND avg_rating>=4
-- SELECT r.origin, r.destination, d.year, d.month,
--        SUM(f.search_count) AS searches,
--        AVG(f.average_rating) AS avg_rating
-- FROM fact_route_usage f
-- JOIN dim_route r ON r.route_key = f.route_key
-- JOIN dim_date  d ON d.date_key  = f.date_key
-- WHERE r.destination = 'SM Tanza'
--   AND d.month = 6
--   AND f.average_rating >= 4
-- GROUP BY r.origin, r.destination, d.year, d.month;

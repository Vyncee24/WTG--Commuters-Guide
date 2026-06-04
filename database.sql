-- =============================================================================
-- WTG: Commuters Guide — Full Database Dump
-- =============================================================================
-- Import instructions:
--   mysql -u root -p < database.sql
-- Or from MySQL shell:
--   SOURCE /path/to/database.sql;
--
-- This file creates the database, all tables, and seeds all route data
-- and the default admin account. Safe to run on a fresh MySQL installation.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. DATABASE
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `wtg_commuters_guide`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `wtg_commuters_guide`;

-- -----------------------------------------------------------------------------
-- 2. TABLE: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100)  NOT NULL,
  `email`      VARCHAR(100)  NOT NULL,
  `password`   VARCHAR(255)  NOT NULL,
  `role`       ENUM('user','admin')                      DEFAULT 'user',
  `status`     ENUM('active','inactive','restricted')    DEFAULT 'active',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLE: routes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `routes` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `route_id`       VARCHAR(100) NOT NULL,
  `from_location`  VARCHAR(100) NOT NULL,
  `to_location`    VARCHAR(100) NOT NULL,
  `duration`       VARCHAR(50)           DEFAULT NULL,
  `fare`           VARCHAR(50)           DEFAULT NULL,
  `transport_type` VARCHAR(50)           DEFAULT NULL,
  `tags`           JSON                  DEFAULT NULL,
  `steps`          JSON                  DEFAULT NULL,
  `map_embed_url`  VARCHAR(1000)         DEFAULT NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_routes_route_id` (`route_id`),
  KEY `idx_routes_locations` (`from_location`, `to_location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLE: saved_routes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `saved_routes` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `user_id`       INT          NOT NULL,
  `route_id`      VARCHAR(100) NOT NULL,
  `from_location` VARCHAR(100) NOT NULL,
  `to_location`   VARCHAR(100) NOT NULL,
  `saved_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_routes` (`user_id`, `route_id`),
  KEY `idx_saved_routes_user` (`user_id`),
  CONSTRAINT `fk_saved_routes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLE: comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `route_id`   VARCHAR(100) NOT NULL,
  `comment`    TEXT         NOT NULL,
  `rating`     INT                   DEFAULT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_route` (`route_id`),
  KEY `idx_comments_user` (`user_id`),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 6. SEED DATA: routes
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `routes`
  (`route_id`, `from_location`, `to_location`, `duration`, `fare`, `transport_type`, `tags`, `steps`)
VALUES

-- Route 1: CVSU CCAT → SM Tanza
(
  'cvsu-ccat_sm-tanza',
  'CVSU CCAT',
  'SM Tanza',
  '45–60 mins',
  '₱30–₱50',
  'jeep',
  '["Cavite","Student Route"]',
  '[{"num":1,"title":"Ride a Jeepney from CVSU CCAT","transport":"jeep","instruction":"Board a jeepney with the signboard \\"Naic / Tanza / SM Tanza\\" in front of CVSU CCAT Gate.","signboard":"Look for: \\"Naic\\", \\"Tanza\\", or \\"SM Tanza\\"","alightAt":"Ride until SM Tanza (Terminal)","fare":"₱15–₱20","mapQuery":"CVSU+CCAT+Naic+Cavite"},{"num":2,"title":"Arrive at SM Tanza","transport":"walk","instruction":"Get off at the SM Tanza terminal. SM Tanza mall entrance is just a short walk from the terminal.","signboard":null,"alightAt":null,"fare":null,"mapQuery":"SM+Tanza+Cavite"}]'
),

-- Route 2: CVSU CCAT → CVSU Main
(
  'cvsu-ccat_cvsu-main',
  'CVSU CCAT',
  'CVSU Main',
  '30–45 mins',
  '₱20–₱35',
  'jeep',
  '["Cavite","Student Route"]',
  '[{"num":1,"title":"Ride a Jeepney towards Indang","transport":"jeep","instruction":"From CVSU CCAT gate, board a jeepney heading towards Indang or Trece Martires. Tell the driver you are going to CVSU Main Campus in Indang.","signboard":"Look for: \\"Indang\\", \\"Trece\\" or \\"CVSU\\"","alightAt":"Alight at Indang town center or CVSU Main gate","fare":"₱15–₱25","mapQuery":"CVSU+CCAT+Naic+Cavite"},{"num":2,"title":"Tricycle to CVSU Main Campus","transport":"tricycle","instruction":"From Indang town center, ride a tricycle going to CVSU Main Campus. You can also walk if you are close to the campus gate.","signboard":null,"alightAt":"CVSU Main Campus Gate","fare":"₱10–₱15","mapQuery":"Cavite+State+University+Indang"}]'
),

-- Route 3: Naic (Poblacion) → SM Molino
(
  'naic-main_sm-molino',
  'Naic (Poblacion)',
  'SM Molino',
  '60–90 mins',
  '₱40–₱60',
  'jeep',
  '["Cavite","Bacoor"]',
  '[{"num":1,"title":"Jeepney from Naic to Bacoor","transport":"jeep","instruction":"From Naic Poblacion, board a jeepney with signboard \\"Bacoor\\" or \\"Imus\\". Ride until Bacoor Rotonda.","signboard":"Look for: \\"Bacoor\\", \\"Imus / Bacoor\\"","alightAt":"Alight at Bacoor Rotonda","fare":"₱20–₱30","mapQuery":"Naic+Poblacion+Cavite"},{"num":2,"title":"Transfer: Jeep or Multicab to SM Molino","transport":"jeep","instruction":"At Bacoor Rotonda, transfer to a jeepney or multicab heading to SM Molino. Look for signboards \\"Molino\\" or \\"SM Molino\\".","signboard":"Look for: \\"Molino\\", \\"SM City Bacoor\\"","alightAt":"SM Molino / SM City Bacoor","fare":"₱15–₱20","mapQuery":"SM+Molino+Bacoor+Cavite"}]'
),

-- Route 4: Imus Central → SM Dasmarinas
(
  'imus-central_sm-dasma',
  'Imus Central',
  'SM Dasmarinas',
  '25–40 mins',
  '₱20–₱35',
  'jeep',
  '["Cavite","Dasmarinas"]',
  '[{"num":1,"title":"Jeepney from Imus to Dasmarinas","transport":"jeep","instruction":"From Imus Central Market terminal, board a jeepney with signboard \\"Dasmarinas\\" or \\"Sampaloc\\". Ride until the SM Dasmarinas terminal.","signboard":"Look for: \\"Dasmarinas\\", \\"Sampaloc Dasma\\"","alightAt":"SM Dasmarinas Terminal","fare":"₱15–₱25","mapQuery":"Imus+Central+Market+Cavite"},{"num":2,"title":"Walk to SM Dasmarinas","transport":"walk","instruction":"SM Dasmarinas is right at the terminal. Walk through the main entrance.","signboard":null,"alightAt":null,"fare":null,"mapQuery":"SM+Dasmarinas+City"}]'
),

-- Route 5: Tagaytay Rotonda → SM Santa Rosa
(
  'tagaytay-rotonda_sm-sta-rosa',
  'Tagaytay Rotonda',
  'SM Santa Rosa',
  '50–70 mins',
  '₱40–₱60',
  'bus',
  '["Tagaytay","Laguna"]',
  '[{"num":1,"title":"Bus from Tagaytay to Sta. Rosa","transport":"bus","instruction":"At Tagaytay Rotonda, board a bus or UV Express going to Sta. Rosa or Alabang. Tell the driver you are heading to SM Sta. Rosa.","signboard":"Look for: \\"Sta. Rosa\\", \\"Alabang\\", \\"Laguna\\"","alightAt":"Sta. Rosa exit / SM Sta. Rosa area","fare":"₱30–₱45","mapQuery":"Tagaytay+Rotonda+Cavite"},{"num":2,"title":"Tricycle to SM Sta. Rosa","transport":"tricycle","instruction":"From the Sta. Rosa highway drop-off, ride a tricycle going to SM Santa Rosa.","signboard":null,"alightAt":"SM Santa Rosa Laguna","fare":"₱10–₱15","mapQuery":"SM+Santa+Rosa+Laguna"}]'
),

-- Route 6: CVSU Main → Trece Martires Palengke
(
  'cvsu-main_trece-palengke',
  'CVSU Main',
  'Trece Martires Palengke',
  '20–35 mins',
  '₱15–₱25',
  'tricycle',
  '["Cavite","Student Route"]',
  '[{"num":1,"title":"Tricycle or Jeep to Indang Proper","transport":"tricycle","instruction":"From CVSU Main Campus, ride a tricycle or walk to Indang town center terminal.","signboard":"Look for tricycles near the campus gate","alightAt":"Indang Terminal","fare":"₱10","mapQuery":"Cavite+State+University+Indang"},{"num":2,"title":"Jeepney to Trece Martires","transport":"jeep","instruction":"From Indang terminal, board a jeepney with \\"Trece Martires\\" on the signboard. Ride until Trece Palengke (market).","signboard":"Look for: \\"Trece Martires\\"","alightAt":"Trece Martires Palengke / City Hall area","fare":"₱10–₱15","mapQuery":"Trece+Martires+City+Hall+Cavite"}]'
),

-- Route 7: McDonalds Maple Grove → Freedom Park
(
  'mcdo-maple_freedom-park',
  'McDonalds Maple Grove',
  'Freedom Park',
  '1hr 30mins - 2hrs',
  '₱15–₱25',
  'jeep',
  '["Cavite","Student Route"]',
  '[{"num":1,"title":"Jeep to Freedom Park Kawit Cavite","transport":"jeep","instruction":"From McDonalds Maple Grove ride a jeepney with \\"potol kawit\\" and \\"Binakayan\\" on the signboard.","signboard":"Look for: \\"Potol kawit\\" and \\"Binakayan\\"","alightAt":"Freedom Park, Kawit, Cavite","fare":"₱20","mapQuery":"Aguinaldo+Freedom+Park"}]'
);

-- -----------------------------------------------------------------------------
-- 7. SEED DATA: default admin user
--    Password: janvincentreyel2406  (bcrypt hash below)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`, `status`)
VALUES (
  'Admin',
  'janvincentreyel24@gmail.com',
  '$2a$10$5XVN0z7HkaJJI2tP6591QuyVm2RWxKKpKkx7NKiyB3nPmPzI.ulKS',
  'admin',
  'active'
);

-- -----------------------------------------------------------------------------
-- 8. MIGRATION: add map_embed_url to existing routes tables
--    Safe to run even if the column already exists (IF NOT EXISTS guard).
-- -----------------------------------------------------------------------------
ALTER TABLE `routes`
  ADD COLUMN IF NOT EXISTS `map_embed_url` VARCHAR(1000) DEFAULT NULL;

-- =============================================================================
-- Import complete.
-- Next steps:
--   1. npm install
--   2. Copy .env and set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
--   3. npm start
-- =============================================================================

-- =============================================================================
-- WTG: Commuters Guide — Live Database Export
-- Generated: 2026-06-07T18:07:49.060Z
-- Import: mysql -u root -p < database.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- TABLE: users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `status` enum('active','inactive','restricted') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `email_2` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`) VALUES
  (1, 'Admin', 'janvincentreyel24@gmail.com', '$2a$10$pdKONMbnWaSKCHQRJfYvIeQ5DBVT6oYAnyeS.gW3Q7uLq3OETu.4e', 'admin', 'active', '2026-06-01 04:30:05', '2026-06-01 04:30:05'),
  (3, 'Sigmon Earl Silvestre', 'sigmonearl627@gmail.com', '$2a$10$spcEBdzXpe6nZcx7mJZGW.jMmbrB8F5EuQavRu/KZxzDgy5QGmN7e', 'user', 'active', '2026-06-01 05:07:19', '2026-06-01 05:07:19'),
  (5, 'Jan Vincent Reyel', 'janvincentreyel2406@gmail.com', '$2a$10$b6doMK0Ggf1AtqNOfSGTDOGv9ZLsoP7DYzuWWxbNvqH.33y0fmq9C', 'user', 'active', '2026-06-04 04:27:49', '2026-06-04 04:41:36'),
  (6, 'ashlee', 'ashleepinakamaganda@gmail.com', '$2a$10$Jin0yEzNBAZ1biyP4jG65uJY/uO8TcfbqkRylRUSPaIf5wJFgY/aW', 'user', 'active', '2026-06-05 12:51:00', '2026-06-05 12:51:00'),
  (7, 'john lloyd', 'testaccount@gmail.com', '$2a$10$p6JtvGugjAS/PhXn5hDMI.SkGIUQKqWYCOPW8AdIZ22j.qmTCbqtq', 'user', 'restricted', '2026-06-05 12:53:27', '2026-06-05 15:36:56');

-- -----------------------------------------------------------------------------
-- TABLE: routes
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `routes`;
CREATE TABLE `routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `route_id` varchar(50) NOT NULL,
  `from_location` varchar(100) NOT NULL,
  `to_location` varchar(100) NOT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `fare` varchar(50) DEFAULT NULL,
  `transport_type` varchar(50) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`steps`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `map_embed_url` varchar(1000) DEFAULT NULL,
  `search_count` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_id` (`route_id`),
  KEY `from_location` (`from_location`,`to_location`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `routes` (`id`, `route_id`, `from_location`, `to_location`, `duration`, `fare`, `transport_type`, `tags`, `steps`, `created_at`, `map_embed_url`, `search_count`) VALUES
  (12, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '50–70 mins', '₱40–₱60', 'bus', '["Tagaytay","Laguna"]', '[{"num":1,"title":"Bus from Tagaytay to Sta. Rosa","transport":"bus","instruction":"At Tagaytay Rotonda, board a bus or UV Express going to Sta. Rosa or Alabang. Tell the driver you are heading to SM Sta. Rosa.","signboard":"Look for: \\"Sta. Rosa\\", \\"Alabang\\", \\"Laguna\\"","alightAt":"Sta. Rosa exit / SM Sta. Rosa area","fare":"₱30–₱45","mapQuery":"Tagaytay+Rotonda+Cavite"},{"num":2,"title":"Tricycle to SM Sta. Rosa","transport":"tricycle","instruction":"From the Sta. Rosa highway drop-off, ride a tricycle going to SM Santa Rosa.","signboard":null,"alightAt":"SM Santa Rosa Laguna","fare":"₱10–₱15","mapQuery":"SM+Santa+Rosa+Laguna"}]', '2026-06-04 04:01:39', NULL, 5),
  (16, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '1 hour', '₱70', 'jeep', '["Student Route"]', '[{"num":1,"title":"Ride a jeepney at the front of CVSU CCAT","transport":"jeep","instruction":"Ride a jeepney in front of CVSU CCAT","signboard":"Look for: \\"Tanza Loob\\"","alightAt":"Side of SM Tanza","fare":"₱20","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780557560091!6m8!1m7!1sDi4BAIsGtcH7udKjGv7YTg!2m2!1d14.39272603280756!2d120.8524703845148!3f225.6917876887095!4f2.6837322745910654!5f0.7820865974627469\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"},{"num":2,"title":"Go to jeep terminal","transport":"walk","instruction":"after you go down near sm tanza, you must walk near MCDO and go terminal between MCDO and 711","signboard":null,"alightAt":null,"fare":"₱20","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780557737339!6m8!1m7!1stbK4rsTjFkLQza4QNR7R3A!2m2!1d14.39181903522483!2d120.8524891349189!3f226.7299728644655!4f7.200017559141614!5f0.9237343421109063\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"},{"num":3,"title":"Ride a jeepney to SM TRECE","transport":"jeep","instruction":"Once you\'re at the terminal ride a jeepney that has a signboard \\"SM TRECE\\"","signboard":"SM TRECE","alightAt":"Minute burger near sm trece","fare":"₱25","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780557994362!6m8!1m7!1s2nH75QHHZkHvfBx3XOnZeA!2m2!1d14.28278641565952!2d120.8683778477293!3f214.4145980880506!4f6.067079360280758!5f1.6464266813243813\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"},{"num":4,"title":"terminal to CVSU MAIN","transport":"walk","instruction":"Once you go down to minute burger, go and walk towards Jollibee, continue walking until you see a jeep terminal that has a signboard CVSU","signboard":null,"alightAt":null,"fare":"₱0","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780558195307!6m8!1m7!1sbun5I65B7vqTaOc3vwxpQg!2m2!1d14.28129534808096!2d120.8684623888195!3f217.66797579331646!4f4.209346173070841!5f1.3335452495909783\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"},{"num":5,"title":"Ride a jeepney to CVSU MAIN","transport":"jeep","instruction":"ride a jeepney that has a signboard CVSU, all jeepney in the terminal will go to CVSU so you don\'t have to worry","signboard":"Look for: CVSU","alightAt":"CVSU main gate","fare":"₱25","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780558347527!6m8!1m7!1sUtjqQIOZrwXm_YSngZp5OQ!2m2!1d14.19556011239007!2d120.8820984986837!3f322.71667199318716!4f-2.524877096192597!5f0.5993094421524947\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"}]', '2026-06-04 07:33:25', NULL, 18),
  (17, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '15 mins', '₱25', 'jeep', '["Mall","Hangouts"]', '[{"num":1,"title":"Ride a jeepney at the front of CVSU CCAT","transport":"jeep","instruction":"Ride a jeepney in front of CVSU CCAT Gate 2, DO NOT CROSS TO MCDO","signboard":"Tanza Loob, Tanza","alightAt":"Sm Tanza","fare":"₱25","mapEmbed":"https://www.google.com/maps/embed?pb=!4v1780625115712!6m8!1m7!1sX9TuVVGpRDDz4vpxjxTFAg!2m2!1d14.39238610532393!2d120.8522547546623!3f291.4761762109243!4f5.688661180229005!5f0.7820865974627469\\" width=\\"600\\" height=\\"450\\" style=\\"border:0;\\" allowfullscreen=\\"\\" loading=\\"lazy\\" referrerpolicy=\\"no-referrer-when-downgrade"}]', '2026-06-05 02:09:38', NULL, 11);

-- -----------------------------------------------------------------------------
-- TABLE: saved_routes
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `saved_routes`;
CREATE TABLE `saved_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `route_id` varchar(50) NOT NULL,
  `from_location` varchar(100) NOT NULL,
  `to_location` varchar(100) NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_save` (`user_id`,`route_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `saved_routes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `saved_routes` (`id`, `user_id`, `route_id`, `from_location`, `to_location`, `saved_at`) VALUES
  (4, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM Tanza', '2026-06-04 05:52:37'),
  (5, 5, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM Tanza', '2026-06-04 05:52:58'),
  (6, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-04 07:36:16'),
  (7, 5, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 12:31:55'),
  (8, 5, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 12:31:59'),
  (9, 6, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 12:51:32'),
  (10, 6, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 12:51:51');

-- -----------------------------------------------------------------------------
-- TABLE: comments
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `route_id` varchar(100) NOT NULL,
  `comment` text NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `route_id` (`route_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `comments` (`id`, `user_id`, `route_id`, `comment`, `rating`, `created_at`) VALUES
  (3, 1, 'cvsu-main_trece-palengke', 'pangit neto, wag yan may mas bago akong alam', NULL, '2026-06-04 06:40:21');

-- -----------------------------------------------------------------------------
-- TABLE: search_history
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `search_history`;
CREATE TABLE `search_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `route_id` varchar(100) DEFAULT NULL,
  `origin` varchar(100) NOT NULL,
  `destination` varchar(100) NOT NULL,
  `searched_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sh_user` (`user_id`),
  KEY `idx_sh_route` (`route_id`),
  KEY `idx_sh_searched_at` (`searched_at`),
  CONSTRAINT `fk_sh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `search_history` (`id`, `user_id`, `route_id`, `origin`, `destination`, `searched_at`) VALUES
  (1, NULL, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 12:31:52'),
  (2, NULL, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 12:31:57'),
  (3, NULL, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 12:32:01'),
  (4, NULL, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 12:51:29'),
  (5, NULL, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 12:51:46'),
  (6, NULL, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 13:11:54'),
  (7, NULL, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:12:09'),
  (8, NULL, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 13:12:50'),
  (9, NULL, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 13:13:11'),
  (10, NULL, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-05 13:25:00'),
  (11, NULL, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:25:22'),
  (12, NULL, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 13:25:57'),
  (13, NULL, 'cvsu-ccat_cvsu-main', 'CVSU MAIN', 'CVSU CCAT', '2026-06-05 13:27:22'),
  (14, 5, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 13:31:12'),
  (15, 6, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:40:40'),
  (16, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:53:20'),
  (17, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:53:24'),
  (18, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:56:03'),
  (19, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-05 13:56:04'),
  (20, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-05 14:50:29'),
  (21, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-07 08:57:25'),
  (22, 5, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 13:00:57'),
  (23, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-07 13:15:29'),
  (24, 1, 'tagaytay-rotonda_sm-sta-rosa', 'Tagaytay Rotonda', 'SM Santa Rosa', '2026-06-07 13:15:36'),
  (25, 1, 'cvsu-ccat_sm-tanza', 'CVSU CCAT', 'SM TANZA', '2026-06-07 13:15:40'),
  (26, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 13:15:44'),
  (27, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 13:39:55'),
  (28, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 14:08:32'),
  (29, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 14:52:13'),
  (30, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 17:18:19'),
  (31, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 17:30:43'),
  (32, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 17:33:55'),
  (33, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 17:35:29'),
  (34, 1, 'cvsu-ccat_cvsu-main', 'CVSU CCAT', 'CVSU MAIN', '2026-06-07 17:54:58');

SET FOREIGN_KEY_CHECKS = 1;

-- Export complete: 2026-06-07T18:07:49.065Z
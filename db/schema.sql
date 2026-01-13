-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: localhost    Database: cookbook_db
-- ------------------------------------------------------
-- Server version	8.0.44-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `dish_ingredients`
--

DROP TABLE IF EXISTS `dish_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dish_ingredients` (
  `dish_ingredient_id` int NOT NULL AUTO_INCREMENT,
  `dish_id` int NOT NULL,
  `ingredient_id` int DEFAULT NULL,
  `ingredient_name` varchar(255) NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_id` int DEFAULT NULL,
  `unit_name` varchar(50) NOT NULL,
  `cost` decimal(10,6) NOT NULL,
  `source` varchar(20) DEFAULT NULL,
  `base_unit` varchar(50) NOT NULL,
  `base_price` decimal(10,4) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `component_text` varchar(100) DEFAULT NULL,
  `component_display_order` int NOT NULL DEFAULT '0',
  `ingredient_display_order` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`dish_ingredient_id`),
  KEY `dish_id` (`dish_id`),
  KEY `ingredient_id` (`ingredient_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `dish_ingredients_ibfk_1` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`) ON DELETE CASCADE,
  CONSTRAINT `dish_ingredients_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE SET NULL,
  CONSTRAINT `dish_ingredients_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`) ON DELETE SET NULL,
  CONSTRAINT `dish_ingredients_chk_1` CHECK ((`quantity` > 0)),
  CONSTRAINT `dish_ingredients_chk_2` CHECK ((`cost` >= 0)),
  CONSTRAINT `dish_ingredients_chk_3` CHECK ((`base_price` >= 0)),
  CONSTRAINT `dish_ingredients_chk_4` CHECK ((`component_display_order` >= 0)),
  CONSTRAINT `dish_ingredients_chk_5` CHECK ((`ingredient_display_order` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dishes`
--

DROP TABLE IF EXISTS `dishes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dishes` (
  `dish_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `recipe_id` int DEFAULT NULL,
  `preparation_date` date NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comment` varchar(500) NOT NULL DEFAULT '',
  `recipe_name` varchar(255) NOT NULL,
  `portion_size` varchar(20) NOT NULL,
  `time_prepared` time DEFAULT NULL,
  `meal` varchar(16) DEFAULT NULL,
  `recipe_by` int NOT NULL,
  PRIMARY KEY (`dish_id`),
  KEY `dishes_ibfk_1` (`recipe_id`),
  CONSTRAINT `dishes_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE SET NULL,
  CONSTRAINT `dishes_chk_1` CHECK ((`total_cost` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plan_days`
--

DROP TABLE IF EXISTS `food_plan_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plan_days` (
  `food_plan_day_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_week_id` int NOT NULL,
  `day_no` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`food_plan_day_id`),
  KEY `fk_food_plan_days_food_plan_weeks` (`food_plan_week_id`),
  CONSTRAINT `fk_food_plan_days_food_plan_weeks` FOREIGN KEY (`food_plan_week_id`) REFERENCES `food_plan_weeks` (`food_plan_week_id`) ON DELETE CASCADE,
  CONSTRAINT `food_plan_days_chk_1` CHECK ((`day_no` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plan_ingredient_records`
--

DROP TABLE IF EXISTS `food_plan_ingredient_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plan_ingredient_records` (
  `fpir_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_id` int DEFAULT NULL,
  `food_plan_week_id` int DEFAULT NULL,
  `food_plan_day_id` int DEFAULT NULL,
  `food_plan_meal_id` int DEFAULT NULL,
  `food_plan_recipe_id` int DEFAULT NULL,
  `recipe_id` int DEFAULT NULL,
  `display_order` int DEFAULT NULL,
  `ingredient_id` int DEFAULT NULL,
  `quantity` decimal(15,9) DEFAULT NULL,
  `base_unit` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fpir_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1223 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plan_meals`
--

DROP TABLE IF EXISTS `food_plan_meals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plan_meals` (
  `food_plan_meal_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_day_id` int NOT NULL,
  `meal_type` varchar(20) NOT NULL DEFAULT 'dinner',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`food_plan_meal_id`),
  KEY `fk_food_plan_meals_food_plan_days` (`food_plan_day_id`),
  CONSTRAINT `fk_food_plan_meals_food_plan_days` FOREIGN KEY (`food_plan_day_id`) REFERENCES `food_plan_days` (`food_plan_day_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plan_recipes`
--

DROP TABLE IF EXISTS `food_plan_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plan_recipes` (
  `food_plan_recipe_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_meal_id` int NOT NULL,
  `recipe_id` int NOT NULL,
  `display_order` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`food_plan_recipe_id`),
  KEY `fk_food_plan_recipes_food_plan_meal_id` (`food_plan_meal_id`),
  KEY `fk_food_plan_recipes_recipe_id` (`recipe_id`),
  CONSTRAINT `fk_food_plan_recipes_food_plan_meal_id` FOREIGN KEY (`food_plan_meal_id`) REFERENCES `food_plan_meals` (`food_plan_meal_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_food_plan_recipes_recipe_id` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=168 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plan_weeks`
--

DROP TABLE IF EXISTS `food_plan_weeks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plan_weeks` (
  `food_plan_week_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_id` int NOT NULL,
  `week_no` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`food_plan_week_id`),
  KEY `fk_food_plan_weeks_food_plans` (`food_plan_id`),
  CONSTRAINT `fk_food_plan_weeks_food_plans` FOREIGN KEY (`food_plan_id`) REFERENCES `food_plans` (`food_plan_id`) ON DELETE CASCADE,
  CONSTRAINT `food_plan_weeks_chk_1` CHECK ((`week_no` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `food_plans`
--

DROP TABLE IF EXISTS `food_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_plans` (
  `food_plan_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_weeks` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`food_plan_id`),
  KEY `fk_food_plans_user` (`user_id`),
  CONSTRAINT `fk_food_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `food_plans_chk_week_no` CHECK ((`total_weeks` between 1 and 6))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fpir`
--

DROP TABLE IF EXISTS `fpir`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fpir` (
  `fpir_id` int NOT NULL AUTO_INCREMENT,
  `food_plan_id` int DEFAULT NULL,
  `food_plan_week_id` int DEFAULT NULL,
  `food_plan_day_id` int DEFAULT NULL,
  `food_plan_meal_id` int DEFAULT NULL,
  `food_plan_recipe_id` int DEFAULT NULL,
  `recipe_id` int DEFAULT NULL,
  `display_order` int DEFAULT NULL,
  `ingredient_id` int DEFAULT NULL,
  `quantity` decimal(15,9) DEFAULT NULL,
  `base_unit` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fpir_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `ingredient_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `base_unit` varchar(50) NOT NULL,
  `default_price` decimal(10,4) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_by` int DEFAULT NULL,
  `approval_status` varchar(20) DEFAULT 'approved',
  `approved_by` int DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `notes` text,
  `cup_weight` decimal(8,3) DEFAULT NULL,
  `cup_unit` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ingredient_id`),
  UNIQUE KEY `name` (`name`),
  KEY `submitted_by` (`submitted_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `ingredients_ibfk_1` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `ingredients_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `ingredients_chk_1` CHECK ((`default_price` > 0)),
  CONSTRAINT `ingredients_chk_2` CHECK ((`approval_status` in (_utf8mb4'pending',_utf8mb4'approved',_utf8mb4'rejected',_utf8mb4'on hold'))),
  CONSTRAINT `ingredients_chk_3` CHECK ((`default_price` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipe_components`
--

DROP TABLE IF EXISTS `recipe_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_components` (
  `recipe_component_id` int NOT NULL AUTO_INCREMENT,
  `recipe_id` int NOT NULL,
  `component_text` varchar(100) NOT NULL,
  `display_order` int DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipe_component_id`),
  UNIQUE KEY `recipe_id` (`recipe_id`,`display_order`),
  CONSTRAINT `recipe_components_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipe_ingredients`
--

DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `recipe_ingredient_id` int NOT NULL AUTO_INCREMENT,
  `recipe_id` int NOT NULL,
  `ingredient_id` int NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unit_id` int NOT NULL,
  `component_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `notes` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`recipe_ingredient_id`),
  KEY `idx_recipe_ing_unit` (`recipe_id`,`ingredient_id`,`unit_id`),
  KEY `recipe_ingredients_ibfk_2` (`ingredient_id`),
  KEY `recipe_ingredients_ibfk_3` (`unit_id`),
  KEY `fk_recipe_ingredients_component` (`component_id`),
  CONSTRAINT `fk_recipe_ingredients_component` FOREIGN KEY (`component_id`) REFERENCES `recipe_components` (`recipe_component_id`) ON DELETE SET NULL,
  CONSTRAINT `recipe_ingredients_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_ingredients_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_ingredients_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`) ON DELETE RESTRICT,
  CONSTRAINT `recipe_ingredients_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipe_procedures`
--

DROP TABLE IF EXISTS `recipe_procedures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_procedures` (
  `procedure_id` int NOT NULL AUTO_INCREMENT,
  `recipe_id` int NOT NULL,
  `step_text` text NOT NULL,
  `step_order` int NOT NULL,
  `estimated_time` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`procedure_id`),
  UNIQUE KEY `unique_recipe_step_order` (`recipe_id`,`step_order`),
  CONSTRAINT `recipe_procedures_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_procedures_chk_1` CHECK ((`step_order` > 0)),
  CONSTRAINT `recipe_procedures_chk_2` CHECK ((`estimated_time` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipes`
--

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `recipe_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `portion_size` varchar(20) DEFAULT NULL,
  `description` text,
  `privacy` varchar(10) NOT NULL DEFAULT 'private',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active_flag` tinyint GENERATED ALWAYS AS ((case when (`is_active` = 1) then 1 else NULL end)) STORED,
  PRIMARY KEY (`recipe_id`),
  UNIQUE KEY `unique_recipe_name_portion` (`name`,`portion_size`,`user_id`,`active_flag`),
  KEY `fk_recipes_users_user_id` (`user_id`),
  CONSTRAINT `fk_recipes_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `recipes_chk_1` CHECK ((`privacy` in (_utf8mb4'private',_utf8mb4'public')))
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `unit_id` int NOT NULL AUTO_INCREMENT,
  `ingredient_id` int NOT NULL,
  `unit_name` varchar(50) NOT NULL,
  `conversion_factor` decimal(10,6) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`unit_id`),
  UNIQUE KEY `unique_ingredient_unit` (`ingredient_id`,`unit_name`),
  CONSTRAINT `units_ibfk_1` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE CASCADE,
  CONSTRAINT `units_chk_1` CHECK ((`conversion_factor` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=400 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_prices`
--

DROP TABLE IF EXISTS `user_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_prices` (
  `user_price_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ingredient_id` int NOT NULL,
  `custom_price` decimal(10,4) NOT NULL,
  `quantity` int NOT NULL,
  `base_unit` varchar(50) DEFAULT NULL,
  `place` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_price_id`),
  KEY `ingredient_id` (`ingredient_id`),
  KEY `fk_user_prices_user_id` (`user_id`),
  CONSTRAINT `fk_user_prices_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_prices_ibfk_1` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE CASCADE,
  CONSTRAINT `user_prices_chk_1` CHECK ((`custom_price` > 0)),
  CONSTRAINT `user_prices_chk_2` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `role` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `password` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  CONSTRAINT `users_chk_1` CHECK ((`role` in (_utf8mb4'user',_utf8mb4'admin')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'cookbook_db'
--
/*!50003 DROP PROCEDURE IF EXISTS `delete_recipe` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `delete_recipe`(
    IN p_user_id INT,
    IN p_recipe_id INT
)
BEGIN
    DECLARE v_user_exist INT;
    DECLARE v_recipe_exist INT;
    DECLARE v_is_active INT;

    
    SELECT COUNT(user_id)
    INTO v_user_exist
    FROM users
    WHERE user_id = p_user_id;

    IF v_user_exist = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid user_id';
    END IF;

    
    SELECT recipe_id, user_id, is_active
    INTO v_recipe_exist, v_user_exist, v_is_active
    FROM recipes
    WHERE recipe_id = p_recipe_id;

    IF v_recipe_exist IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid recipe by the user';
    END IF;

    IF v_user_exist != p_user_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid owner of the recipe';
    END IF;

    IF v_is_active = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipe already inactive';
    END IF;

    
    UPDATE recipes
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE recipe_id = p_recipe_id;

    UPDATE recipe_ingredients
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE recipe_id = p_recipe_id;

    UPDATE recipe_components
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE recipe_id = p_recipe_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `insert_ingredient_plus_units` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_ingredient_plus_units`(
    IN p_name VARCHAR(30),
    IN p_reference_quantity DECIMAL(10,4),
    IN p_reference_unit VARCHAR(10),
    IN p_default_price DECIMAL(10,4),
    IN p_cup_equivalent_weight DECIMAL(10,4),
    IN p_cup_equivalent_unit VARCHAR(10),
    IN p_notes VARCHAR(100),
    IN p_user_id INT,
    IN p_role VARCHAR(10)
)
main_block: BEGIN
    DECLARE v_reference_unit VARCHAR(10);
    DECLARE v_reference_quantity DECIMAL(12,6);
    DECLARE v_default_price DECIMAL(12,6);
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_cup_weight DECIMAL(12,6);
    DECLARE v_tbsp_weight DECIMAL(12,6);
    DECLARE v_tsp_weight DECIMAL(12,6);
    DECLARE v_per_ml_weight DECIMAL(12,6);
    DECLARE v_litre_weight DECIMAL(12,6);
    DECLARE v_kg_weight DECIMAL(12,6);
    DECLARE v_gm_weight DECIMAL(12,6);
    DECLARE v_ingredient_id INT;

     
    IF p_reference_quantity IS NULL OR p_reference_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reference quantity. Must be a number and > 0';
    END IF;

    SET v_reference_quantity = 1;
    SET v_default_price = p_default_price / p_reference_quantity;
    SET v_reference_unit = p_reference_unit;

    
    IF p_default_price IS NULL OR p_default_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid default price. Must be a number and > 0';
    END IF;

    
    IF p_reference_unit = 'kg' THEN
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'g' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'oz' THEN
        SET v_default_price = v_default_price * 35.274;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'lbs' THEN
        SET v_default_price = v_default_price * 2.20462;
        SET v_reference_unit = 'kg';

    
    ELSEIF p_reference_unit = 'l' THEN
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'ml' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'fl.oz' THEN
        SET v_default_price = v_default_price / 0.0284131; 
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'pint' THEN
        SET v_default_price = v_default_price / 0.568261; 
        SET v_reference_unit = 'l';

    
    ELSEIF p_reference_unit IN ('pc', 'bunch') THEN
        SET v_reference_unit = p_reference_unit;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported reference unit';
    END IF;

    
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    
    
    IF ((p_cup_equivalent_weight > 0 AND (p_cup_equivalent_unit IS NULL OR p_cup_equivalent_unit = ''))
        OR ((p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight = 0) AND (p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> ''))
        OR (p_cup_equivalent_weight < 0)) THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cup weight and unit must both be filled (weight > 0 + unit), or both empty (0/NULL + empty unit)';
    END IF;

    
    INSERT INTO ingredients (name, base_unit, default_price, is_active, approval_status, approved_by, approval_date, notes, cup_weight, cup_unit)
    VALUES(p_name, v_reference_unit, v_default_price, 1, 'approved', NULL, CURRENT_TIMESTAMP, p_notes, p_cup_equivalent_weight, p_cup_equivalent_unit);

    
    SET v_ingredient_id = LAST_INSERT_ID();

    
    IF v_reference_unit = 'kg' THEN
        
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);

    ELSEIF v_reference_unit = 'l' THEN
        
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'tsp', 0.005, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'tbsp', 0.015, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'cup', 0.240, CURRENT_TIMESTAMP);

    ELSEIF v_reference_unit = 'pc' THEN
        
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'pc', 1.000000, CURRENT_TIMESTAMP);
    
    ELSEIF v_reference_unit = 'bunch' THEN
        
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'bunch', 1.000000, CURRENT_TIMESTAMP);
    END IF;

    
    IF (p_cup_equivalent_weight IS NOT NULL AND p_cup_equivalent_weight > 0
    AND p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> '') THEN

         
        IF p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent weight. Must be a number and > 0';
        END IF;
        
        IF p_cup_equivalent_unit NOT IN ('kg', 'g', 'oz', 'lbs') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent unit. Must be IN (kg, g, oz, lbs)';
        END IF;

        
        IF v_reference_unit = 'kg' THEN
            
            IF p_cup_equivalent_unit = 'g' THEN
                SET v_cup_weight = p_cup_equivalent_weight/1000;
            ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
            ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
            ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_equivalent_weight;
            END IF;
        
            SET v_tbsp_weight = ROUND(v_cup_weight/16,6);
            SET v_tsp_weight = ROUND(v_tbsp_weight/3,6);
            SET v_per_ml_weight = ROUND(v_cup_weight/240,6);
            SET v_litre_weight = ROUND(v_per_ml_weight * 1000,6);
            
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
            VALUES
                (v_ingredient_id, 'cup', v_cup_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'tbsp', v_tbsp_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'tsp', v_tsp_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'ml', v_per_ml_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'l', v_litre_weight, CURRENT_TIMESTAMP);

        
        ELSEIF v_reference_unit = 'l' THEN
            
            IF p_cup_equivalent_unit = 'g' THEN
                SET v_cup_weight = p_cup_equivalent_weight/1000;
            ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
            ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
            ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_equivalent_weight;
            END IF;
        
            SET v_kg_weight = ROUND(1000 * v_cup_weight/240,6);
            SET v_gm_weight = ROUND(v_kg_weight / 1000,6);
            
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
            VALUES
                (v_ingredient_id, 'kg', v_kg_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'g', v_gm_weight, CURRENT_TIMESTAMP);
        END IF;   
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `insert_units_depending_on_base_unit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_units_depending_on_base_unit`(
    IN p_ingredient_id INT,
    IN p_weight_quantity DECIMAL(10,6),
    IN p_weight_unit VARCHAR(50),
    IN p_weighing_instrument VARCHAR(50),
    IN p_user_id INT
)
main_block: BEGIN
    DECLARE v_base_unit VARCHAR(50);
    DECLARE v_weight_quantity FLOAT(10,6);
    DECLARE v_rows INT;

    SELECT base_unit
    INTO v_base_unit
    FROM ingredients
    WHERE ingredient_id = p_ingredient_id;

    
     IF v_base_unit IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient from db';
    END IF;

    
    IF v_base_unit != 'kg' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Base unit not in kg. Sort it first.';
    END IF;

    
    IF v_base_unit IN ('kg') THEN 
        
        
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (p_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
        
        
        IF p_weight_quantity IS NULL OR p_weight_quantity <= 0 OR p_weight_unit IS NULL OR p_weighing_instrument IS NULL THEN
            LEAVE main_block;
        END IF;

        
        IF p_weighing_instrument NOT IN ('cup', 'tbsp', 'tsp') OR  p_weight_quantity <= 0 THEN
            LEAVE main_block;
        END IF;

        
        IF p_weight_unit NOT IN ('kg','g') THEN 
            LEAVE main_block;
        END IF;
        
        IF p_weight_unit = 'g' THEN 
            SET v_weight_quantity = p_weight_quantity/1000;
        END IF; 

        
        SELECT COUNT(*)
        INTO v_rows
        FROM units
        WHERE ingredient_id = p_ingredient_id AND unit_name = p_weighing_instrument;

        IF v_rows != 0 THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Units already available for the ingredients.';
        END IF;

        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES(p_ingredient_id, p_weighing_instrument, v_weight_quantity, CURRENT_TIMESTAMP);

        
        IF p_weighing_instrument = 'tsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tbsp', v_weight_quantity * 3, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'cup', v_weight_quantity * 48, CURRENT_TIMESTAMP);
            END IF;
        
        ELSEIF p_weighing_instrument = 'tbsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tsp', v_weight_quantity / 3, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'cup', v_weight_quantity * 16, CURRENT_TIMESTAMP);
            END IF;
        
        ELSEIF p_weighing_instrument = 'cup' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tsp', v_weight_quantity / 48, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tbsp', v_weight_quantity / 16, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `insert_unit_with_related` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_unit_with_related`(
    IN p_ingredient_id INT,
    IN p_unit_name VARCHAR(50),
    IN p_conversion_factor DECIMAL(10,6),
    IN p_is_active BOOLEAN
)
BEGIN
    DECLARE base_unit VARCHAR(50);
    
    
    SELECT i.base_unit INTO base_unit
    FROM ingredients i
    WHERE i.ingredient_id = p_ingredient_id;
    
    
    INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
    VALUES (p_ingredient_id, p_unit_name, p_conversion_factor, p_is_active, CURRENT_TIMESTAMP);
    
    
    IF base_unit = 'kg' AND p_unit_name IN ('tsp', 'tbsp', 'cup') THEN
        
        IF p_unit_name = 'tsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tbsp', p_conversion_factor * 3, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'cup', p_conversion_factor * 48, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        
        ELSEIF p_unit_name = 'tbsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tsp', p_conversion_factor / 3, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'cup', p_conversion_factor * 16, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        
        ELSEIF p_unit_name = 'cup' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tsp', p_conversion_factor / 48, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tbsp', p_conversion_factor / 16, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `populate_dish_ingredients` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `populate_dish_ingredients`(
    IN p_dish_id INT,
    IN p_recipe_id INT,
    IN p_source VARCHAR(20)
)
BEGIN
    DECLARE v_dish_exists INT;
    
    
    IF p_source NOT IN ('user_price', 'default_price') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid source: must be user_price or default_price';
    END IF;
    
    
    SELECT COUNT(*) INTO v_dish_exists
    FROM dishes
    WHERE dish_id = p_dish_id;
    
    IF v_dish_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dish ID not found';
    END IF;
    
    
    START TRANSACTION;
    
    
    INSERT INTO dish_ingredients (
        dish_id,
        ingredient_id,
        quantity,
        unit_name,
        unit_price,
        total_ingredient_cost,
        source,
        base_unit,
        base_price
    )
    SELECT
        p_dish_id,
        i.ingredient_id,
        ri.quantity,
        u.unit_name,
        ROUND(i.default_price * u.conversion_factor, 2),
        ri.quantity * i.default_price * u.conversion_factor,
        p_source,
        i.base_unit,
        i.default_price
    FROM ingredients i
    JOIN recipe_ingredients ri ON i.ingredient_id = ri.ingredient_id
    JOIN units u ON ri.unit_id = u.unit_id
    JOIN recipes r ON ri.recipe_id = r.recipe_id
    JOIN users us ON r.user_id = us.user_id
    WHERE r.recipe_id = p_recipe_id
    AND ri.is_active = TRUE;
    
    
    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `update_ingredient_plus_units` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_ingredient_plus_units`(
    IN p_ingredient_id INT,
    IN p_name VARCHAR(30),
    IN p_reference_quantity DECIMAL(10,6),
    IN p_reference_unit VARCHAR(10),
    IN p_default_price DECIMAL(10,4),
    IN p_cup_equivalent_weight DECIMAL(10,6),
    IN p_cup_equivalent_unit VARCHAR(10),
    IN p_notes VARCHAR(100),
    IN p_user_id INT,
    IN p_role VARCHAR(10)
)
main_block: BEGIN
    
    DECLARE v_reference_unit VARCHAR(10);
    DECLARE v_reference_quantity DECIMAL(12,6);
    DECLARE v_default_price DECIMAL(10,5);
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_cup_weight DECIMAL(12,6);
    DECLARE v_tbsp_weight DECIMAL(12,6);
    DECLARE v_tsp_weight DECIMAL(12,6);
    DECLARE v_per_ml_weight DECIMAL(12,6);
    DECLARE v_litre_weight DECIMAL(12,6);
    DECLARE v_kg_weight DECIMAL(12,6);
    DECLARE v_gm_weight DECIMAL(12,6);
    DECLARE v_ingredient_id INT;
    DECLARE v_old_name VARCHAR(30);
    DECLARE v_old_base_unit VARCHAR(10);
    DECLARE v_old_default_price DECIMAL(12,6);
    DECLARE v_old_cup_weight DECIMAL(12,3); 
    DECLARE v_old_cup_unit VARCHAR(10);
    DECLARE v_old_notes VARCHAR(100);
    DECLARE v_msg TEXT;
    DECLARE v_temp_unit_id INT;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_temp_unit_id = NULL;

    
    SET p_name = REGEXP_REPLACE(TRIM(p_name), '\\s+', ' ');
    SET p_reference_unit = TRIM(p_reference_unit);
    SET p_cup_equivalent_unit = TRIM(p_cup_equivalent_unit);
    SET p_notes = REGEXP_REPLACE(TRIM(p_notes), '\\s+', ' ');

    
    
    IF p_ingredient_id IS NULL OR p_ingredient_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient id. Must be a number and > 0';
    END IF;

    
    IF p_name IS NULL OR p_name = "" THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient name. Must be a String and not empty';
    END IF;

    
    IF p_reference_quantity IS NULL OR p_reference_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reference quantity. Must be a number and > 0';
    END IF;

    
    IF p_default_price IS NULL OR p_default_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid default price. Must be a number and > 0';
    END IF;

    SET v_reference_quantity = 1;
    SET v_default_price = p_default_price / p_reference_quantity;
    SET v_reference_unit = p_reference_unit;
    
    IF p_reference_unit = 'kg' THEN
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'g' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'oz' THEN
        SET v_default_price = v_default_price * 35.274;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'lbs' THEN
        SET v_default_price = v_default_price * 2.20462;
        SET v_reference_unit = 'kg';

    
    ELSEIF p_reference_unit = 'l' THEN
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'ml' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'fl.oz' THEN
        SET v_default_price = v_default_price / 0.0284131; 
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'pint' THEN
        SET v_default_price = v_default_price / 0.568261; 
        SET v_reference_unit = 'l';

    
    ELSEIF p_reference_unit IN ('pc', 'bunch') THEN
        SET v_reference_unit = p_reference_unit;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported reference unit';
    END IF;

    SET v_ingredient_id = p_ingredient_id;

    
    IF p_cup_equivalent_weight IS NOT NULL AND p_cup_equivalent_weight != 0 THEN
        IF v_reference_unit NOT IN ('kg','l') THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cant have cup weight and unit for any item with reference unit other than mass or volume.';
        END IF;
        IF p_cup_equivalent_weight < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup weight. If supplied, must be a positive number';
        END IF;
    END IF;

    
    IF p_cup_equivalent_unit IS NOT NULL THEN
        IF v_reference_unit NOT IN ('kg','l') and p_cup_equivalent_unit <> '' THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cant have cup weight and unit for any item with reference unit other than weight or litre volume.';
        END IF;
        IF p_cup_equivalent_unit NOT IN ('kg', 'g', 'oz', 'lbs','') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup unit. Must be IN (kg, g, oz, lbs)';
        END IF;
    END IF;

    
    
    IF ((p_cup_equivalent_weight > 0 AND (p_cup_equivalent_unit IS NULL OR p_cup_equivalent_unit = ''))
        OR ((p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight = 0) AND (p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> ''))) THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cup weight and unit must both be filled (weight > 0 + unit), or both empty (0/NULL + empty unit/"")';
    END IF;
    
    
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE ingredient_id =  p_ingredient_id;
    IF v_exists = 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ingredient id does not exists in db.';  
    END IF;    

    
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name AND ingredient_id !=  p_ingredient_id;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    
    SELECT name, base_unit, default_price, notes, cup_weight, cup_unit
    INTO v_old_name, v_old_base_unit, v_old_default_price, v_old_notes, v_old_cup_weight, v_old_cup_unit
    FROM ingredients
    WHERE ingredient_id = p_ingredient_id;


    SET v_msg = CONCAT('old name: ', v_old_name,'- new name: ', p_name,
                    ' | old unit: ', v_old_base_unit, ' - new unit: ',v_reference_unit,
                    ' | old price: ', v_old_default_price,' new price: ',ROUND(v_default_price, 4));

    
    IF (v_old_name != p_name) OR (v_old_base_unit != v_reference_unit) OR 
        (v_old_default_price != ROUND(v_default_price, 4)) OR (v_old_notes != p_notes OR (v_old_notes IS NULL) != (p_notes IS NULL)) OR
        (v_old_cup_weight != v_cup_weight OR (v_old_cup_weight IS NULL) != (v_cup_weight IS NULL)) OR
        (v_old_cup_unit != p_cup_equivalent_unit) THEN
        

        UPDATE ingredients 
        SET name = p_name, base_unit = v_reference_unit, default_price = v_default_price, 
            notes = p_notes, cup_weight = p_cup_equivalent_weight, cup_unit = p_cup_equivalent_unit
        WHERE ingredient_id = p_ingredient_id;
    
    
    END IF;

    
    IF v_old_base_unit != v_reference_unit THEN
        UPDATE units
        SET is_active = 0, end_date = CURRENT_TIMESTAMP
        WHERE ingredient_id = p_ingredient_id;

        
        IF v_reference_unit = 'kg' THEN
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP);
            END IF;
            
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'oz';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.02835, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP);
            END IF;

            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'lbs';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.453592, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        
        IF v_reference_unit = 'l' THEN
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP);
            END IF;
            
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.240000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'cup', 0.240000, CURRENT_TIMESTAMP);
            END IF;

            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.015000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tbsp', 0.015000, CURRENT_TIMESTAMP);
            END IF;

            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.005000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tsp', 0.005000, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        
        IF v_reference_unit = 'pc' THEN
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'pc';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'pc', 1.000000, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        
        IF v_reference_unit = 'bunch' THEN
            
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'bunch';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'bunch', 1.000000, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;

    
    
    IF (v_reference_unit IN ('kg', 'l')) THEN
        IF (p_cup_equivalent_weight IS NOT NULL AND p_cup_equivalent_weight > 0
        AND p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> '') THEN

            
            UPDATE units
            SET is_active = 0, end_date = CURRENT_TIMESTAMP
            WHERE ingredient_id = p_ingredient_id;

            
            IF v_reference_unit = 'kg' THEN
                
                IF p_cup_equivalent_unit = 'g' THEN
                    SET v_cup_weight = p_cup_equivalent_weight/1000;
                ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
                ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
                ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight;
                END IF;
            
                SET v_tbsp_weight = ROUND(v_cup_weight/16,6);
                SET v_tsp_weight = ROUND(v_tbsp_weight/3,6);
                SET v_per_ml_weight = ROUND(v_cup_weight/240,6);
                SET v_litre_weight = ROUND(v_per_ml_weight * 1000,6);

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET  conversion_factor = 1.000000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET  conversion_factor = 0.001000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'oz';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.0283495, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'oz', 0.0283495, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'lbs';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.453592, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_cup_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'cup', v_cup_weight, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_tbsp_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'tbsp', v_tbsp_weight, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_tsp_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'tsp', v_tsp_weight, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_per_ml_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'ml', v_per_ml_weight, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_litre_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'l', v_litre_weight, CURRENT_TIMESTAMP);
                END IF;

            
            ELSEIF v_reference_unit = 'l' THEN
                
                IF p_cup_equivalent_unit = 'g' THEN
                    SET v_cup_weight = p_cup_equivalent_weight/1000;
                ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
                ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
                ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                    SET v_cup_weight = p_cup_equivalent_weight;
                END IF;
            
                SET v_kg_weight = ROUND(1000 * 0.240/v_cup_weight,6);
                SET v_gm_weight = ROUND(v_kg_weight / 1000,6);

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.240000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'cup', 0.240000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.015000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'tbsp', 0.015000, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = 0.005000, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'tsp', 0.005000, CURRENT_TIMESTAMP);
                END IF;
                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_kg_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'kg', v_kg_weight, CURRENT_TIMESTAMP);
                END IF;

                
                SELECT unit_id 
                INTO v_temp_unit_id
                FROM units 
                WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

                IF v_temp_unit_id IS NOT NULL THEN 
                    UPDATE units
                    SET conversion_factor = v_gm_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                    WHERE unit_id = v_temp_unit_id;
                ELSE
                    INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                    VALUES (v_ingredient_id, 'g', v_gm_weight, CURRENT_TIMESTAMP);
                END IF;
            
            

            


            END IF;   
        END IF;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `update_insert_user_price` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_insert_user_price`(
    IN p_user_id INT,
    IN p_ingredient_id INT,
    IN p_price DECIMAL(10,4),
    IN p_quantity INT,
    IN p_base_unit VARCHAR(50),
    IN p_place VARCHAR(255)
)
BEGIN
    DECLARE v_ing_count INT;
    DECLARE v_user_exists INT;
    DECLARE v_ingredient_exists INT;
    DECLARE v_old_prices INT;
    
    
    IF p_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Price must be greater than 0';
    END IF;
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than 0';
    END IF;
    
    
    SELECT COUNT(*) 
    INTO v_user_exists 
    FROM users 
    WHERE user_id = p_user_id;
    IF v_user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid user_id';
    END IF;
    
    SELECT COUNT(*) INTO v_ingredient_exists FROM ingredients WHERE ingredient_id = p_ingredient_id;
    IF v_ingredient_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient_id';
    END IF;
    
    
    SELECT COUNT(*) 
    INTO v_ing_count
    FROM user_prices
    WHERE user_id = p_user_id
    AND ingredient_id = p_ingredient_id
    AND is_active = TRUE;
    
    
    
        
        IF v_ing_count > 0 THEN
            UPDATE user_prices
            SET is_active = FALSE,
                end_date = CURRENT_DATE
            WHERE user_id = p_user_id
            AND ingredient_id = p_ingredient_id
            AND is_active = 1;
        END IF;
        
        SELECT COUNT(*) INTO v_old_prices FROM user_prices 
        WHERE user_id = p_user_id
        AND ingredient_id = p_ingredient_id
        AND custom_price = p_price
        AND is_active = 0;
        
        IF v_old_prices > 0 THEN 

            
            UPDATE user_prices
            SET is_active = TRUE,
                end_date = NULL,
                place = p_place
            WHERE user_id = p_user_id
            AND ingredient_id = p_ingredient_id
            AND custom_price = p_price
            AND is_active = 0;

        ELSE
            
            INSERT INTO user_prices (
                user_id,
                ingredient_id,
                custom_price,
                quantity,
                base_unit,
                place,
                is_active,
                created_at
            )
            VALUES (
                p_user_id,
                p_ingredient_id,
                p_price,
                p_quantity,
                p_base_unit,
                p_place,
                1,
                CURRENT_TIMESTAMP
            );
        END IF;
    
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-13 10:56:31

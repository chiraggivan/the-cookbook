DROP TABLE IF EXISTS `user_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_ingredients` (
  `user_ingredient_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `submitted_by` int DEFAULT NULL,
  `base_unit` varchar(50) NOT NULL,
  `base_price` decimal(10,4) NOT NULL,
  `cup_weight` decimal(8,3) DEFAULT NULL,
  `cup_unit` varchar(10) DEFAULT NULL,
  `display_unit` varchar(50) NOT NULL,
  `display_price` decimal(10,4) NOT NULL,
  `display_quantity` decimal(10,3) NOT NULL,
  `approval_status` varchar(20) DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_ingredient_id`),
  KEY `submitted_by` (`submitted_by`),
  CONSTRAINT `user_ingredients_fk_1` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `user_ingredients_fk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `user_ingredients_chk_1` CHECK ((`display_price` > 0)),
  CONSTRAINT `user_ingredients_chk_2` CHECK ((`base_price` > 0)),
  CONSTRAINT `user_ingredients_chk_3` CHECK ((`display_quantity` > 0)),
  CONSTRAINT `user_ingredients_chk_4` CHECK ((`cup_weight` > 0) OR (`cup_weight` IS NULL)),
  CONSTRAINT `user_ingredients_chk_5` CHECK ((`approval_status` in (_utf8mb4'pending',_utf8mb4'approved',_utf8mb4'rejected',_utf8mb4'on hold')))
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


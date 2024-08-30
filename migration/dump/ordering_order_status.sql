-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: ordering
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `order_status`
--

DROP TABLE IF EXISTS `order_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_code` int NOT NULL COMMENT '주문번호',
  `status` int NOT NULL COMMENT '배달 상태',
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_status_pk` (`order_code`,`status`),
  KEY `order_status_order_category_code_fk` (`status`),
  CONSTRAINT `order_status_order_category_code_fk` FOREIGN KEY (`status`) REFERENCES `order_category` (`status`),
  CONSTRAINT `order_status_order_id_fk` FOREIGN KEY (`order_code`) REFERENCES `order` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status`
--

LOCK TABLES `order_status` WRITE;
/*!40000 ALTER TABLE `order_status` DISABLE KEYS */;
INSERT INTO `order_status` VALUES (3,3,1,'2024-08-16 10:09:59'),(4,4,1,'2024-08-16 10:23:14'),(5,3,7,'2024-08-22 14:36:38'),(6,4,2,'2024-08-16 10:23:14'),(7,4,3,'2024-08-16 10:23:14'),(9,4,4,'2024-08-16 10:23:14'),(10,4,5,'2024-08-16 10:23:14'),(11,4,6,'2024-08-16 10:23:14'),(12,5,1,'2024-08-26 15:12:23'),(13,5,4,'2024-08-26 15:12:23'),(14,6,1,'2024-08-26 19:57:48'),(15,5,5,'2024-08-29 19:45:42'),(16,5,6,'2024-08-30 11:14:33'),(17,7,1,'2024-08-30 12:25:31'),(18,8,1,'2024-08-30 12:29:58'),(19,9,1,'2024-08-30 12:33:01'),(20,7,2,'2024-08-30 13:11:04'),(21,7,3,'2024-08-30 13:26:23'),(22,10,1,'2024-08-30 18:23:33'),(23,11,1,'2024-08-30 18:25:24'),(24,11,2,'2024-08-30 18:25:50');
/*!40000 ALTER TABLE `order_status` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-08-31  3:50:28

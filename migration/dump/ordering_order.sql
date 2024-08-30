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
-- Table structure for table `order`
--

DROP TABLE IF EXISTS `order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer` int NOT NULL,
  `menu` int NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `request` varchar(15) DEFAULT NULL,
  `memo` varchar(50) DEFAULT NULL COMMENT '메모',
  `price` int NOT NULL DEFAULT '0' COMMENT '가격',
  PRIMARY KEY (`id`),
  KEY `order_status_customer_id_fk` (`customer`),
  KEY `order_status_menu_id_fk` (`menu`),
  CONSTRAINT `order_status_customer_id_fk` FOREIGN KEY (`customer`) REFERENCES `customer` (`id`),
  CONSTRAINT `order_status_menu_id_fk` FOREIGN KEY (`menu`) REFERENCES `menu` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order`
--

LOCK TABLES `order` WRITE;
/*!40000 ALTER TABLE `order` DISABLE KEYS */;
INSERT INTO `order` VALUES (3,4,21,'2024-08-16 10:09:59',NULL,NULL,18000),(4,4,9,'2024-08-16 10:23:14',NULL,NULL,19000),(5,3,7,'2024-08-26 15:12:23',NULL,NULL,19000),(6,8,12,'2024-08-26 19:57:48',NULL,NULL,21000),(7,1,0,'2024-08-30 12:25:31','','공기밥',1000),(8,1,0,'2024-08-30 12:29:58','많이 담아주세요','왕공기밥',0),(9,1,0,'2024-08-30 12:33:01','500ml 부탁합니다','물',0),(10,14,0,'2024-08-30 18:23:33',NULL,'공깃밥',0),(11,15,0,'2024-08-30 18:25:24',NULL,'잡곡밥',1500);
/*!40000 ALTER TABLE `order` ENABLE KEYS */;
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

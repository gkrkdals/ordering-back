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
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'pk',
  `name` varchar(20) NOT NULL DEFAULT '',
  `category` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PRICE_CATEGORY_FK` (`category`),
  CONSTRAINT `PRICE_CATEGORY_FK` FOREIGN KEY (`category`) REFERENCES `menu_category` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (0,'추가메뉴',4),(1,'과일(제철00가지)',2),(2,'야채(제철00가지)',2),(3,'야과(과일+야채)',2),(4,'마른오징어',1),(5,'김치전',1),(6,'먹태구이',1),(7,'부추전',1),(8,'한치+육포',1),(9,'감자전',1),(10,'노가리+대구포',1),(11,'해물파전',1),(12,'모듬포',2),(13,'후라이드치킨',1),(14,'순살치킨',1),(15,'양념치킨',2),(16,'순살양념',2),(17,'양념반반',2),(18,'순살반반',2),(19,'과일샐러드',1),(20,'깐풍새우',1),(21,'야채샐러드',1),(22,'칠리새우',1),(23,'크래미(꽃살)샐러드',1),(24,'크림새우',1),(25,'수제어묵탕',1),(26,'해물국물떡뽁이',1),(27,'골뱅이소면',1),(28,'낙지소면',1),(29,'오징어초무침',1),(30,'불맛오징어볶음',1),(31,'생율',1),(32,'돈까스',1),(33,'화채',1),(34,'치즈돈까스',2),(35,'황도',1),(36,'생선까스',1),(37,'계란말이',1),(38,'치즈계란말이',2),(39,'스팸과후라이',1),(40,'찹스테이크',1),(41,'햄치즈',1),(42,'참치카나페',1),(43,'모듬소세지',1),(44,'소세지야채볶음',1),(45,'고추잡채',1),(46,'꿔바로우',1),(47,'모듬감자튀김',1),(48,'오징어숙회',1),(49,'두부김치',1),(50,'닭똥집',1),(51,'두부조림',1),(52,'무뼈닭발',1),(53,'제육볶음',1),(54,'닭도리탕',3),(55,'훈제족발',3),(56,'훈제오리',3);
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-08-31  3:50:29

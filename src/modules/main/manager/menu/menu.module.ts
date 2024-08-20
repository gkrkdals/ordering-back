import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { MenuController } from "@src/modules/main/manager/menu/menu.controller";
import { MenuService } from "@src/modules/main/manager/menu/menu.service";
import { FoodCategory } from "@src/entities/food-category.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Menu,
      FoodCategory,
    ]),
  ],
  controllers: [MenuController],
  providers: [MenuService]
})
export class MenuModule {}
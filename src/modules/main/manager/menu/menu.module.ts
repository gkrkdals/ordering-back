import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { MenuController } from "@src/modules/main/manager/menu/menu.controller";
import { MenuService } from "@src/modules/main/manager/menu/menu.service";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Menu,
      MenuCategory,
    ]),
  ],
  controllers: [MenuController],
  providers: [MenuService, JwtService]
})
export class MenuModule {}
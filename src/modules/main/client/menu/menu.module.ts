import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { MenuController } from "@src/modules/main/client/menu/menu.controller";
import { MenuService } from "@src/modules/main/client/menu/menu.service";
import { MenuCategory } from "@src/entities/menu-category.entity";
import { Customer } from "@src/entities/customer.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [TypeOrmModule.forFeature([Menu, MenuCategory, Customer])],
  controllers: [MenuController],
  providers: [MenuService, JwtService],
})
export class MenuModule {}
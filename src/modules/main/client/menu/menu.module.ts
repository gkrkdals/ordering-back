import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { MenuController } from "@src/modules/main/client/menu/menu.controller";
import { MenuService } from "@src/modules/main/client/menu/menu.service";
import { MenuCategory } from "@src/entities/menu-category.entity";
import { Customer } from "@src/entities/customer.entity";
import { JwtService } from "@nestjs/jwt";
import { CustomerPrice } from "@src/entities/customer-price";
import { Order } from "@src/entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([
    Menu,
    MenuCategory,
    Customer,
    CustomerPrice,
    Order
  ])],
  controllers: [MenuController],
  providers: [MenuService, JwtService],
})
export class MenuModule {}
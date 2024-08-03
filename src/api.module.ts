import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ormConfig } from "./config/mysql";
import { MenuModule } from "./modules/main/menu/menu.module";
import { OrderModule } from "./modules/main/order/order.module";

@Module({
  imports: [
    TypeOrmModule.forRootAsync(ormConfig), 
    MenuModule,
    OrderModule,
  ],
})
export class ApiModule {}
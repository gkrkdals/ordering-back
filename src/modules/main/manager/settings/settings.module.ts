import { Module } from "@nestjs/common";
import { SettingsController } from "@src/modules/main/manager/settings/settings.controller";
import { SettingsService } from "@src/modules/main/manager/settings/settings.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { Customer } from "@src/entities/customer.entity";
import { Menu } from "@src/entities/menu.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Customer,
      Menu,
    ])
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
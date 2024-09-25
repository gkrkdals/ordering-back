import { Module } from "@nestjs/common";
import { SettingsController } from "@src/modules/main/manager/settings/settings.controller";
import { SettingsService } from "@src/modules/main/manager/settings/settings.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
    ])
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
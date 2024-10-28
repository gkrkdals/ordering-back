import { Module } from "@nestjs/common";
import { SettingsController } from "@src/modules/main/manager/settings/settings.controller";
import { SettingsService } from "@src/modules/main/manager/settings/settings.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { Settings } from "@src/entities/settings.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Settings
    ])
  ],
  controllers: [SettingsController],
  providers: [SettingsService, JwtService],
})
export class SettingsModule {}
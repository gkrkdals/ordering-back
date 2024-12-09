import { Module } from "@nestjs/common";
import { SettingsController } from "@src/modules/main/manager/settings/settings.controller";
import { SettingsService } from "@src/modules/main/manager/settings/services/settings.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { Settings } from "@src/entities/settings.entity";
import { JwtService } from "@nestjs/jwt";
import { NoAlarmsService } from "@src/modules/main/manager/settings/services/no-alarms.service";
import { CalculationService } from "@src/modules/main/manager/settings/services/calculation.service";
import { Customer } from "@src/entities/customer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Customer,
      Settings
    ])
  ],
  controllers: [SettingsController],
  providers: [SettingsService, NoAlarmsService, CalculationService, JwtService],
})
export class SettingsModule {}
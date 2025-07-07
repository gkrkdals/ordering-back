import { Module } from "@nestjs/common";
import { SettingsController } from "@src/modules/main/manager/settings/controllers/settings.controller";
import { SettingsService } from "@src/modules/main/manager/settings/services/settings.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order/order.entity";
import { Settings } from "@src/entities/settings.entity";
import { JwtService } from "@nestjs/jwt";
import { NoAlarmsService } from "@src/modules/main/manager/settings/services/no-alarms.service";
import { CalculationService } from "@src/modules/main/manager/settings/services/calculation.service";
import { Customer } from "@src/entities/customer/customer.entity";
import { BusinessHoursController } from "@src/modules/main/manager/settings/controllers/business-hours.controller";
import { BusinessHoursService } from "@src/modules/main/manager/settings/services/business-hours.service";
import { CronModule } from "@src/modules/misc/cron/cron.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Customer,
      Settings
    ]),
    CronModule,
  ],
  controllers: [SettingsController, BusinessHoursController],
  providers: [SettingsService, BusinessHoursService, NoAlarmsService, CalculationService, JwtService],
})
export class SettingsModule {}
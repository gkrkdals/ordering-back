import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { NoAlarmsService } from "@src/modules/misc/no-alarms/no-alarms.service";

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  providers: [NoAlarmsService],
  exports: [NoAlarmsService]
})
export class NoAlarmsModule {}
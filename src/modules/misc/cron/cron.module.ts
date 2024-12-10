import { Module } from "@nestjs/common";
import { CronService } from "@src/modules/misc/cron/cron.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Menu } from "@src/entities/menu.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Settings, Menu])],
  exports: [CronService],
  providers: [CronService],
})
export class CronModule {}
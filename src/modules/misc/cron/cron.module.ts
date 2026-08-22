import { Module } from "@nestjs/common";
import { CronService } from "@src/modules/misc/cron/cron.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { GroupMenuSoldOut } from "@src/entities/menu/group-menu-sold-out.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Settings, Menu, GroupMenuSoldOut])],
  exports: [CronService],
  providers: [CronService],
})
export class CronModule {}
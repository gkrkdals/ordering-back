import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GLOBAL_GROUP_ID, Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";
import { CronService } from "@src/modules/misc/cron/cron.service";
import { trimTime } from "@src/utils/date";
import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";

@Injectable()
export class BusinessHoursService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    private readonly cronService: CronService,
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  /** 그룹 행이 없으면 전역 값을 보여준다 (저장하는 순간 그룹 전용 행이 생긴다) */
  async getHours(groupId?: number) {
    return this.customerSettingsService.getSettings(4, groupId);
  }

  async updateHours(hours: UpdateHoursDto[], groupId?: number) {
    const targetGroupId = groupId ?? GLOBAL_GROUP_ID;
    // 그룹을 처음 편집하면 전역 값을 복사한 7행을 먼저 만든다
    await this.customerSettingsService.ensureGroupRows(4, targetGroupId);

    for (const hour of hours) {
      const currentHour = await this.settingsRepository.findOneBy({
        big: 4, sml: hour.sml, groupId: targetGroupId,
      });

      if (!currentHour) {
        continue;
      }


      const { startHour, startMinute, endHour, endMinute } = hour;
      const sh = trimTime(startHour);
      const sm = trimTime(startMinute, false);
      const eh = trimTime(endHour);
      const em = trimTime(endMinute, false);
      currentHour.stringValue = `${sh}:${sm}~${eh}:${em}`;
      await this.settingsRepository.save(currentHour);
    }

    this.cronService.cancelAllTasks();
    await this.cronService.scheduleTasks();
  }
}
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";
import { CronService } from "@src/modules/misc/cron/cron.service";
import { trimTime } from "@src/utils/date";

@Injectable()
export class BusinessHoursService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    private readonly cronService: CronService,
  ) {}

  async getHours() {
    return this.settingsRepository.findBy({
      big: 4
    });
  }

  async updateHours(hours: UpdateHoursDto[]) {
    for (const hour of hours) {
      const currentHour = await this.settingsRepository.findOneBy({ big: 4, sml: hour.sml });

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
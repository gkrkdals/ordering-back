import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";
import { CronService } from "@src/modules/misc/cron/cron.service";

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
      const sh = this.trimTime(startHour);
      const sm = this.trimTime(startMinute, false);
      const eh = this.trimTime(endHour);
      const em = this.trimTime(endMinute, false);
      currentHour.stringValue = `${sh}:${sm}~${eh}:${em}`;
      await this.settingsRepository.save(currentHour);
    }

    this.cronService.cancelAllTasks();
    await this.cronService.scheduleTasks();
  }

  private trimTime(time: string, isHour: boolean = true) {
    const numberTime = parseInt(time);

    if (isNaN(numberTime)) {
      return '';
    }

    if (isHour && (numberTime >= 24 || numberTime < 0)) {
      return '';
    }

    if (!isHour && (numberTime >= 60 || numberTime < 0)) {
      return '';
    }

    return time;
  }
}
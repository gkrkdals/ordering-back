import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";

@Injectable()
export class NoAlarmsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  private async getNoAlarms() {
    const noAlarmsRaw = (await this.settingsRepository.findOneBy({ big: 3, sml: 1 })).stringValue;
    if (noAlarmsRaw.length === 0) {
      return [];
    }
    return noAlarmsRaw.split(',').map(numberInString => parseInt(numberInString));
  }

  async isNoAlarm(menu: number) {
    return (await this.getNoAlarms()).some(noAlarmMenu => noAlarmMenu === menu);
  }
}
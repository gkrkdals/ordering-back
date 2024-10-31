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

  async getNoAlarms() {
    const noAlarmsRaw = (await this.settingsRepository.findOneBy({ big: 3, sml: 1 })).stringValue;

    if (noAlarmsRaw.length === 0) {
      return [];
    }

    return noAlarmsRaw.split(',').map(numberInString => parseInt(numberInString));
  }

  async updateNoAlarms(noAlarmMenu: number) {
    const noAlarmsInstance = await this.settingsRepository.findOneBy({ big: 3, sml: 1 });
    const noAlarms = await this.getNoAlarms();
    if (noAlarms.some(menu => menu === noAlarmMenu)) {
      return;
    }
    noAlarms.push(noAlarmMenu);
    noAlarmsInstance.stringValue = noAlarms.join(',');
    await this.settingsRepository.save(noAlarmsInstance);
  }

  async deleteNoAlarms(noAlarmMenu: number) {
    const noAlarmsInstance = await this.settingsRepository.findOneBy({ big: 3, sml: 1 });
    const noAlarms = await this.getNoAlarms();

    const index = noAlarms.findIndex(menu => menu === noAlarmMenu);
    if (index >= 0) {
      noAlarms.splice(index, 1);
    }

    noAlarmsInstance.stringValue = noAlarms.join(',');
    await this.settingsRepository.save(noAlarmsInstance);
  }
}
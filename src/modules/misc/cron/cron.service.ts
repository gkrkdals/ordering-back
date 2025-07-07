import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import * as cron from 'node-cron';
import { Menu } from "@src/entities/menu/menu.entity";

@Injectable()
export class CronService implements OnModuleInit {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  private tasks: cron.ScheduledTask[] = [];

  onModuleInit() {
    this.scheduleTasks().then();
  }

  async scheduleTasks() {
    const businessHours = await this.settingsRepository.findBy({ big: 4 });

    let day = 1;
    for (const businessHour of businessHours) {
      const timeSegments = businessHour.stringValue.split(/[:~]/g);
      const startHour = this.trimTime(timeSegments[0]);
      const startMinute = this.trimTime(timeSegments[1]);
      const endHour = this.trimTime(timeSegments[2]);
      const endMinute = this.trimTime(timeSegments[3]);

      if (startHour.length > 0) {
        const task1 = cron.schedule(`${startMinute} ${startHour} * * ${day}`, () => {
          this.menuRepository.update({}, { soldOut: 0 });
        });

        this.tasks.push(task1);
      }

      if (endHour.length > 0) {
        const task2 = cron.schedule(`${endMinute} ${endHour} * * ${(day + 1) % 7}`, () => {
          this.menuRepository.update({}, { soldOut: 1 });
        });

        this.tasks.push(task2);
      }

      day++;
    }
  }

  cancelAllTasks() {
    this.tasks.forEach(task => task.stop());

    this.tasks = [];
  }

  private trimTime(time: string) {
    if (time.length > 1 && time.at(0) === '0') {
      return time.at(1);
    }

    return time;
  }

}
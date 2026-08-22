import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GLOBAL_GROUP_ID, Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import * as cron from 'node-cron';
import { Menu } from "@src/entities/menu/menu.entity";
import { GroupMenuSoldOut } from "@src/entities/menu/group-menu-sold-out.entity";

@Injectable()
export class CronService implements OnModuleInit {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(GroupMenuSoldOut)
    private groupSoldOutRepository: Repository<GroupMenuSoldOut>,
  ) {}

  private tasks: cron.ScheduledTask[] = [];

  onModuleInit() {
    this.scheduleTasks().then();
  }

  /**
   * 영업시간에 맞춰 메뉴를 자동으로 품절/해제하는 태스크를 등록합니다.
   *
   * 전역(group_id = 0) 영업시간은 menu.sold_out 전체를 뒤집고,
   * 그룹 영업시간은 그 그룹의 group_menu_sold_out 만 갱신합니다.
   */
  async scheduleTasks() {
    // 전역 + 모든 그룹의 영업시간을 함께 읽어 그룹마다 태스크를 건다
    const businessHours = await this.settingsRepository.findBy({ big: 4 });

    for (const businessHour of businessHours) {
      // 요일은 행 순서가 아니라 sml(1=월 … 7=일)로 정한다
      const day = businessHour.sml ?? 0;
      const groupId = businessHour.groupId ?? GLOBAL_GROUP_ID;
      const timeSegments = (businessHour.stringValue ?? '').split(/[:~]/g);
      const startHour = this.trimTime(timeSegments[0] ?? '');
      const startMinute = this.trimTime(timeSegments[1] ?? '');
      const endHour = this.trimTime(timeSegments[2] ?? '');
      const endMinute = this.trimTime(timeSegments[3] ?? '');

      if (startHour.length > 0) {
        const task1 = cron.schedule(`${startMinute} ${startHour} * * ${day}`, () => {
          this.setSoldOut(groupId, 0).then();
        });

        this.tasks.push(task1);
      }

      if (endHour.length > 0) {
        const task2 = cron.schedule(`${endMinute} ${endHour} * * ${(day + 1) % 7}`, () => {
          this.setSoldOut(groupId, 1).then();
        });

        this.tasks.push(task2);
      }
    }
  }

  cancelAllTasks() {
    this.tasks.forEach(task => task.stop());

    this.tasks = [];
  }

  /**
   * 전역이면 메뉴 테이블을, 그룹이면 그 그룹의 품절 행을 일괄 갱신합니다.
   *
   * 그룹 품절은 메뉴마다 행이 있어야 전역 값을 덮어쓸 수 있으므로,
   * 살아 있는 메뉴 전체에 대해 행을 만들어 둡니다.
   */
  private async setSoldOut(groupId: number, soldOut: number) {
    if (groupId === GLOBAL_GROUP_ID) {
      await this.menuRepository.update({}, { soldOut });
      return;
    }

    const menus = await this.menuRepository.find({ select: { id: true } });

    if (menus.length === 0) {
      return;
    }

    await this.groupSoldOutRepository.upsert(
      menus.map(menu => ({ groupId, menu: menu.id, soldOut })),
      ['groupId', 'menu'],
    );
  }

  private trimTime(time: string) {
    if (time.length > 1 && time.at(0) === '0') {
      return time.at(1);
    }

    return time;
  }

}

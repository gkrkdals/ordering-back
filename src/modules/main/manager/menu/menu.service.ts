import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { GroupMenuSoldOut } from "@src/entities/menu/group-menu-sold-out.entity";
import { MenuSchedule } from "@src/entities/menu/menu-schedule.entity";
import { UpdateMenuScheduleDto } from "@src/modules/main/manager/menu/dto/update-menu-schedule.dto";
import { WEEKDAY_NAMES, trimTime } from "@src/utils/date";
import { GLOBAL_GROUP_ID } from "@src/entities/settings.entity";
import { FindOptionsOrder, FindOperator, Like, MoreThan, Not, Raw, Repository } from "typeorm";
import { countToTotalPage } from "@src/utils/data";
import { hasJamo, SQL_GAP, toSearchPattern } from "@src/utils/hangul";
import { GetMenuResponseDto } from "@src/modules/main/manager/menu/dto/response/get-menu-response.dto";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import * as XLSX from 'xlsx-js-style';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(MenuCategory)
    private readonly foodCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(GroupMenuSoldOut)
    private readonly groupSoldOutRepository: Repository<GroupMenuSoldOut>,
    @InjectRepository(MenuSchedule)
    private readonly menuScheduleRepository: Repository<MenuSchedule>,
  ) {}

  async getMenus(
    column: keyof Menu,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string | undefined,
    groupId?: number,
  ): Promise<GetMenuResponseDto> {
    // 초성이 섞인 검색어는 음절 범위 정규식으로, 그 외에는 기존 부분일치로 찾는다
    const like: FindOperator<string> = hasJamo(query ?? '')
      ? Raw(alias => `${alias} REGEXP :pattern`, { pattern: toSearchPattern(query, SQL_GAP) })
      : Like(`%${query}%`);
    const findOrder: FindOptionsOrder<Menu> = {}

    if (order !== '') {
      findOrder[column] = order;
    } else {
      findOrder.seq = 'asc';
      findOrder.id = 'asc';
    }

    const [data, count] = await this.menuRepository.findAndCount({
      relations: {
        menuCategory: true,
      },
      where: [
        { menuCategory: { name: like }, withdrawn: Not(1) },
        { name: like, withdrawn: Not(1) },
      ],
      order: findOrder
    });

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      // 그룹을 고른 상태면 그 그룹의 품절 상태를 얹고, 판매시간이 걸린 메뉴를 표시한다
      data: await this.markScheduled(await this.applyGroupSoldOut(data, groupId), groupId),
      count,
    }
  }

  async getAll(): Promise<Menu[]> {
    return this.menuRepository.find({
      relations: { menuCategory: true },
      where: { withdrawn: Not(1) },
      order: { seq: 'ASC' }
    });
  }

  async getMenuCategoryAll(): Promise<MenuCategory[]> {
    return this.foodCategoryRepository.find({
      where: { id: MoreThan(0) },
      order: { price: 'ASC' }
    });
  }

  async createMenu(body: Menu) {
    const newMenu = new Menu();
    newMenu.name = body.name;
    newMenu.category = body.category;
    await this.menuRepository.save(newMenu);
  }

  async createMenuFromExcel(excel: Express.Multer.File) {
    const workbook = XLSX.read(excel.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    for (const row of data) {
      const menuName = row['메뉴명'];
      const category = typeof row['카테고리'] === "string" ? parseInt(row['카테고리']) : row['카테고리'];

      if (menuName === undefined || menuName === null) {
        continue;
      }

      if (!isNaN(category)) {
        const newMenu = new Menu();
        newMenu.name = menuName;
        newMenu.category = category;

        await this.menuRepository.save(newMenu);
      }
    }
  }

  async updateMenu(menu: Menu): Promise<void> {
    const updatedMenu = await this.menuRepository.findOneBy({ id: menu.id });

    if (updatedMenu) {
      updatedMenu.category = menu.category;
      updatedMenu.name = menu.name;
      updatedMenu.soldOut = menu.soldOut;
      updatedMenu.isDiscountable = menu.isDiscountable;
      updatedMenu.isRewardable = menu.isRewardable;
      await this.menuRepository.save(updatedMenu);
    }
  }

  /**
   * 메뉴 하나의 품절을 토글합니다.
   *
   * groupId 를 주면 그 그룹의 품절만 바꾸고 전역 menu.sold_out 은 건드리지 않습니다.
   */
  async toggleSoldOut(menu: number, soldOut: boolean, groupId?: number) {
    const nextValue = !soldOut ? 1 : 0;

    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      await this.menuRepository.update({ id: menu }, { soldOut: nextValue });
      return;
    }

    await this.groupSoldOutRepository.upsert(
      { groupId, menu, soldOut: nextValue },
      ['groupId', 'menu'],
    );
  }

  async toggleSoldOutAll(soldOut: boolean, groupId?: number) {
    const nextValue = soldOut ? 1 : 0;

    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      await this.menuRepository.update({}, { soldOut: nextValue });
      return;
    }

    const menus = await this.menuRepository.find({ select: { id: true } });

    if (menus.length === 0) {
      return;
    }

    await this.groupSoldOutRepository.upsert(
      menus.map(item => ({ groupId, menu: item.id, soldOut: nextValue })),
      ['groupId', 'menu'],
    );
  }

  /**
   * 그룹의 품절 상태를 얹어 목록을 돌려줍니다. (관리자 메뉴 탭에서 그룹을 골랐을 때)
   *
   * 그룹 행이 없는 메뉴는 전역 값을 그대로 보여줍니다.
   */
  private async applyGroupSoldOut(menus: Menu[], groupId?: number) {
    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      return menus;
    }

    const rows = await this.groupSoldOutRepository.findBy({ groupId });
    const map: Record<number, number> = {};
    rows.forEach(row => { map[row.menu] = row.soldOut; });

    menus.forEach(menu => { menu.soldOut = map[menu.id] ?? menu.soldOut; });

    return menus;
  }

  /**
   * 판매시간이 설정된 메뉴에 hasSchedule 을 달아줍니다.
   *
   * 관리자 목록의 품절 칸은 '수동 품절' 상태만 보여주므로, 시간 제약 때문에
   * 고객 화면에서 품절로 보일 수 있다는 걸 여기서 드러냅니다.
   * 그룹 전용 스케줄이 없으면 전역 스케줄을 따르므로 둘 다 확인합니다.
   */
  private async markScheduled(menus: Menu[], groupId?: number) {
    const target = Number(groupId) || GLOBAL_GROUP_ID;
    const rows = await this.menuScheduleRepository.find({
      where: target === GLOBAL_GROUP_ID
        ? { groupId: GLOBAL_GROUP_ID }
        : [{ groupId: target }, { groupId: GLOBAL_GROUP_ID }],
    });

    const groupMenus = new Set(rows.filter(row => row.groupId === target).map(row => row.menu));
    const globalMenus = new Set(rows.filter(row => row.groupId === GLOBAL_GROUP_ID).map(row => row.menu));

    return menus.map(menu => ({
      ...menu,
      hasSchedule: groupMenus.has(menu.id) || globalMenus.has(menu.id),
    })) as Menu[];
  }

  async updateMenuSeq(seqArray: { id: number, seq: number | null }[]) {
    for (const element of seqArray) {
      const foundMenu = await this.menuRepository.findOneBy({ id: element.id });
      foundMenu.seq = element.seq;
      await this.menuRepository.save(foundMenu);
    }
  }

  async deleteMenu(id: number): Promise<void> {
    const foundMenu = await this.menuRepository.findOneBy({ id });
    foundMenu.withdrawn = 1;
    await this.menuRepository.save(foundMenu);
  }

  /**
   * 메뉴의 요일별 판매시간을 조회합니다. 항상 7행(월~일)을 돌려줍니다.
   *
   * 그룹 행이 하나도 없으면 전역(0) 값을 대신 내려줘, 화면이 '전체 공통을 따르는 중'임을
   * 알 수 있게 합니다. 저장하는 순간 그룹 전용 행이 만들어집니다.
   */
  async getMenuSchedule(menu: number, groupId = GLOBAL_GROUP_ID) {
    const target = Number(groupId) || GLOBAL_GROUP_ID;
    const groupRows = await this.menuScheduleRepository.findBy({ groupId: target, menu });
    const rows = groupRows.length > 0 || target === GLOBAL_GROUP_ID
      ? groupRows
      : await this.menuScheduleRepository.findBy({ groupId: GLOBAL_GROUP_ID, menu });

    return Array.from({ length: 7 }, (_, index) => {
      const sml = index + 1;
      const found = rows.find(row => row.sml === sml);

      return {
        sml,
        name: WEEKDAY_NAMES[index],
        groupId: found?.groupId ?? GLOBAL_GROUP_ID,
        stringValue: found?.stringValue ?? null,
      };
    });
  }

  /**
   * 메뉴의 요일별 판매시간을 저장합니다.
   *
   * 네 칸이 모두 유효할 때만 제약을 걸고, 하나라도 비면 그 요일은 제약 없음(행 삭제)입니다.
   */
  async updateMenuSchedule(menu: number, days: UpdateMenuScheduleDto[], groupId = GLOBAL_GROUP_ID) {
    const target = Number(groupId) || GLOBAL_GROUP_ID;

    for (const day of days) {
      const sh = trimTime(day.startHour);
      const sm = trimTime(day.startMinute, false);
      const eh = trimTime(day.endHour);
      const em = trimTime(day.endMinute, false);
      const isComplete = [sh, sm, eh, em].every(part => part.length > 0);

      if (!isComplete) {
        await this.menuScheduleRepository.delete({ groupId: target, menu, sml: day.sml });
        continue;
      }

      await this.menuScheduleRepository.upsert(
        {
          groupId: target,
          menu,
          sml: day.sml,
          stringValue: `${sh.padStart(2, '0')}:${sm.padStart(2, '0')}~${eh.padStart(2, '0')}:${em.padStart(2, '0')}`,
        },
        ['groupId', 'menu', 'sml'],
      );
    }
  }
}

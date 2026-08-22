import { BadRequestException, Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GLOBAL_GROUP_ID, Settings } from "@src/entities/settings.entity";
import { Response } from "express";
import { createReadStream } from "fs";
import Path from "path";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { trimTime, WEEKDAY_NAMES } from "@src/utils/date";
import { UpdateDisposalTimeDto } from "@src/modules/main/manager/settings/dto/update-disposal-time.dto";
import { POINT_USE_UNIT } from "@src/types/point";
import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,

    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  /** 조리·배달 초과시간은 주방·배달이 하나뿐이라 그룹으로 나누지 않고 전역만 쓴다 */
  async getExceedSettings() {
    return (await this.findExceedSettings()).map(setting => ({
      ...setting,
      value: setting.value?.toString(),
    }));
  }

  async updateExceedSettings(cookExceed: number, deliverDelay: number) {
    // 예전에는 settingsRepository.find()로 테이블 전체를 읽어 앞 두 행을 덮어썼다.
    // 그룹 행이 생기면 남의 설정을 망가뜨리므로 big=1 전역 행만 정확히 집는다.
    const settings = await this.findExceedSettings();
    const values = [cookExceed, deliverDelay];

    for (const [index, setting] of settings.entries()) {
      if (values[index] === undefined) {
        break;
      }

      setting.value = values[index];
      await this.settingsRepository.save(setting);
    }
  }

  /** 화면이 [0]=조리초과, [1]=배달지연 순서로 읽으므로 순서를 고정한다 */
  private findExceedSettings() {
    return this.settingsRepository.find({
      where: { big: 1, groupId: GLOBAL_GROUP_ID },
      order: { sml: 'ASC', id: 'ASC' },
    });
  }

  async getStandardInfo() {
    return (await this.settingsRepository.findBy({ big: 2, groupId: GLOBAL_GROUP_ID }))
      .map(setting => ({
        ...setting,
        stringValue: setting.stringValue ?? ''
      }));
  }

  async updateStandardInfo(settings: Settings[]) {
    for(const setting of settings.filter(setting => setting.sml !== 1)) {
      const currentSetting = await this.settingsRepository.findOneBy({ id: setting.id });
      currentSetting.stringValue = setting.stringValue;
      await this.settingsRepository.save(currentSetting);
    }
  }

  async getLogo(res: Response) {
    const filename = (await this.settingsRepository.findOneBy({ big: 2, sml: 1, groupId: GLOBAL_GROUP_ID })).stringValue;
    const ext = filename.split('.').at(1);
    const file = createReadStream(Path.join(process.cwd(), 'logo', filename));
    res.set({
      'Content-Type': `image/${ext}`
    })
    return new StreamableFile(file);
  }

  async updateLogo(name: string) {
    const logoSetting = await this.settingsRepository.findOneBy({ big: 2, sml: 1, groupId: GLOBAL_GROUP_ID });
    logoSetting.stringValue = name;
    await this.settingsRepository.save(logoSetting);
  }

  async getMenuCategories() {
    return (await this.menuCategoryRepository.find()).map(c => ({ ...c, modified: false, deleted: false }));
  }

  async modifyMenuCategories(modified: any[], added: any[]) {
    const m = modified.filter(p => p.modified);
    const d = modified.filter(p => p.deleted);

    for (const item of d) {
      const [, cnt] = await this.menuRepository.findAndCount({
        where: {
          category: item.id
        }
      });
      if (cnt === 0) {
        await this.menuCategoryRepository.delete({ id: item.id });
      }
    }

    for (const item of m) {
      const modified = new MenuCategory();
      modified.id = item.id;
      modified.hex = item.hex;
      modified.name = item.name;
      modified.price = item.price;
      await this.menuCategoryRepository.save(modified);
    }

    for (const item of added) {
      const newCategory = new MenuCategory();
      newCategory.hex = item.hex;
      newCategory.name = item.name;
      newCategory.price = item.price;
      await this.menuCategoryRepository.save(newCategory);
    }
  }

  /** 그룹 값이 없으면 전역 값을 보여준다 (편집 후 저장하면 그룹 전용 행이 생긴다) */
  async getDiscountValue(groupId?: number) {
    const discountSetting = await this.customerSettingsService.getSetting(5, 1, groupId);
    return (discountSetting?.value ?? 0) / 1000;
  }

  async updateDiscount(value: number, groupId?: number) {
    await this.upsertSetting(5, 1, 'web_discount', value, groupId);
  }

  /**
   * 그릇 수거 시간(big=6) 은 요일별 7행(sml 1=월 … 7=일) 구조입니다.
   * 과거에는 sml=1 단일 행에 전 요일 공통 설정을 저장했으므로,
   * 누락된 요일 행을 기존 값으로 채워 넣어 기존 동작을 그대로 보존합니다.
   */
  private async ensureDisposalRows(groupId: number = GLOBAL_GROUP_ID) {
    const rows = await this.settingsRepository.findBy({ big: 6, groupId });
    // 그룹 행이 아직 없으면 전역 값을 복사해 만든다 (전역이면 과거 단일 행 값을 쓴다)
    const globalRows = groupId === GLOBAL_GROUP_ID
      ? rows
      : await this.settingsRepository.findBy({ big: 6, groupId: GLOBAL_GROUP_ID });
    const legacyValue = globalRows.find(row => row.sml === 1)?.stringValue ?? null;

    for (let sml = 1; sml <= 7; sml++) {
      const name = WEEKDAY_NAMES[sml - 1];
      const existing = rows.find(row => row.sml === sml);

      if (!existing) {
        const created = new Settings();
        created.big = 6;
        created.sml = sml;
        created.name = name;
        created.stringValue = globalRows.find(row => row.sml === sml)?.stringValue ?? legacyValue;
        created.groupId = groupId;
        rows.push(await this.settingsRepository.save(created));
        continue;
      }

      // 과거 단일 행의 name('disposal_time')을 요일 라벨로 교정 — 화면에 그대로 노출됩니다.
      if (existing.name !== name) {
        existing.name = name;
        await this.settingsRepository.save(existing);
      }
    }

    return rows.sort((a, b) => a.sml - b.sml);
  }

  async getDisposalTimes(groupId?: number) {
    return this.ensureDisposalRows(groupId ?? GLOBAL_GROUP_ID);
  }

  async updateDisposalTimes(days: UpdateDisposalTimeDto[], groupId?: number) {
    const rows = await this.ensureDisposalRows(groupId ?? GLOBAL_GROUP_ID);

    for (const day of days) {
      const currentDay = rows.find(row => row.sml === day.sml);

      if (!currentDay) {
        continue;
      }

      const sh = trimTime(day.startHour);
      const sm = trimTime(day.startMinute, false);
      const eh = trimTime(day.endHour);
      const em = trimTime(day.endMinute, false);

      // 네 칸이 모두 유효할 때만 제한을 적용하고, 그 외에는 해당 요일을 종일 허용으로 둡니다.
      const isComplete = [sh, sm, eh, em].every(part => part.length > 0);
      currentDay.stringValue = isComplete
        ? `${sh.padStart(2, '0')}:${sm.padStart(2, '0')}~${eh.padStart(2, '0')}:${em.padStart(2, '0')}`
        : null;

      await this.settingsRepository.save(currentDay);
    }
  }

  async getMinUsePoint(groupId?: number) {
    const setting = await this.customerSettingsService.getSetting(7, 1, groupId);
    if (!setting) {
      return 3000;
    }
    return setting.value ?? 3000;
  }

  async updateMinUsePoint(value: number, groupId?: number) {
    await this.upsertSetting(7, 1, 'min_use_point', value, groupId);
  }

  /**
   * 적립금 사용 정책을 조회합니다. 최소 사용 금액만 설정 대상이고,
   * 사용 단위는 1,000원 고정(POINT_USE_UNIT)입니다. 두 값 모두 원 단위입니다.
   */
  async getPointUsePolicy(groupId?: number) {
    const minSetting = await this.customerSettingsService.getSetting(7, 1, groupId);

    return {
      minUsePoint: minSetting ? (minSetting.value ?? 3000) : 3000,
      useUnit: POINT_USE_UNIT,
    };
  }

  async updatePointUsePolicy(minUsePoint: number, groupId?: number) {
    // 사용 단위가 1,000원이므로 최소 금액도 1,000원 단위여야 안내 문구와 어긋나지 않는다
    if (!Number.isInteger(minUsePoint) || minUsePoint <= 0 || minUsePoint % POINT_USE_UNIT !== 0) {
      throw new BadRequestException(
        `최소 사용 금액은 ${POINT_USE_UNIT.toLocaleString()}원 단위로 입력해주세요`
      );
    }

    await this.upsertSetting(7, 1, 'min_use_point', minUsePoint, groupId);
  }

  /** 그룹 행이 없으면 만들어 저장한다. groupId가 없거나 0이면 전역 행을 고친다 */
  private async upsertSetting(big: number, sml: number, name: string, value: number, groupId?: number) {
    const targetGroupId = groupId ?? GLOBAL_GROUP_ID;
    let setting = await this.settingsRepository.findOneBy({ big, sml, groupId: targetGroupId });

    if (!setting) {
      setting = new Settings();
      setting.big = big;
      setting.sml = sml;
      setting.name = name;
      setting.groupId = targetGroupId;
    }

    setting.value = value;
    await this.settingsRepository.save(setting);
  }
}
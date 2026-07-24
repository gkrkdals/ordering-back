import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Response } from "express";
import { createReadStream } from "fs";
import Path from "path";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { trimTime, WEEKDAY_NAMES } from "@src/utils/date";
import { UpdateDisposalTimeDto } from "@src/modules/main/manager/settings/dto/update-disposal-time.dto";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async getExceedSettings() {
    return (await this.settingsRepository.findBy({ big: 1 })).map(setting => ({
      ...setting,
      value: setting.value?.toString(),
    }));
  }

  async updateExceedSettings(cookExceed: number, deliverDelay: number) {
    const settings = await this.settingsRepository.find();
    settings[0].value = cookExceed;
    settings[1].value = deliverDelay;
    settings.forEach(setting => this.settingsRepository.save(setting));
  }

  async getStandardInfo() {
    return (await this.settingsRepository.findBy({ big: 2 }))
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
    const filename = (await this.settingsRepository.findOneBy({ big: 2, sml: 1 })).stringValue;
    const ext = filename.split('.').at(1);
    const file = createReadStream(Path.join(process.cwd(), 'logo', filename));
    res.set({
      'Content-Type': `image/${ext}`
    })
    return new StreamableFile(file);
  }

  async updateLogo(name: string) {
    const logoSetting = await this.settingsRepository.findOneBy({ big: 2, sml: 1 });
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

  async getDiscountValue() {
    const discountSetting = await this.settingsRepository.findOneBy({ big: 5, sml: 1 });
    return discountSetting.value / 1000;
  }

  async updateDiscount(value: number) {
    const discountSetting = await this.settingsRepository.findOneBy({ big: 5, sml: 1 });
    discountSetting.value = value;
    await this.settingsRepository.save(discountSetting);
  }

  /**
   * 그릇 수거 시간(big=6) 은 요일별 7행(sml 1=월 … 7=일) 구조입니다.
   * 과거에는 sml=1 단일 행에 전 요일 공통 설정을 저장했으므로,
   * 누락된 요일 행을 기존 값으로 채워 넣어 기존 동작을 그대로 보존합니다.
   */
  private async ensureDisposalRows() {
    const rows = await this.settingsRepository.findBy({ big: 6 });
    const legacyValue = rows.find(row => row.sml === 1)?.stringValue ?? null;

    for (let sml = 1; sml <= 7; sml++) {
      const name = WEEKDAY_NAMES[sml - 1];
      const existing = rows.find(row => row.sml === sml);

      if (!existing) {
        const created = new Settings();
        created.big = 6;
        created.sml = sml;
        created.name = name;
        created.stringValue = legacyValue;
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

  async getDisposalTimes() {
    return this.ensureDisposalRows();
  }

  async updateDisposalTimes(days: UpdateDisposalTimeDto[]) {
    const rows = await this.ensureDisposalRows();

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

  async getMinUsePoint() {
    const setting = await this.settingsRepository.findOneBy({ big: 7, sml: 1 });
    if (!setting) {
      return 3000;
    }
    return setting.value ?? 3000;
  }

  async updateMinUsePoint(value: number) {
    let setting = await this.settingsRepository.findOneBy({ big: 7, sml: 1 });
    if (!setting) {
      setting = new Settings();
      setting.big = 7;
      setting.sml = 1;
      setting.name = 'min_use_point';
    }
    setting.value = value;
    await this.settingsRepository.save(setting);
  }
}
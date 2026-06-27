import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Response } from "express";
import { createReadStream } from "fs";
import Path from "path";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { Menu } from "@src/entities/menu/menu.entity";

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

  async getDisposalTime() {
    const disposalSetting = await this.settingsRepository.findOneBy({ big: 6, sml: 1 });
    
    if (!disposalSetting || !disposalSetting.stringValue) {
      return {
        start_time: null,
        end_time: null,
      };
    }

    const [startTime, endTime] = disposalSetting.stringValue.split('~');
    return {
      start_time: startTime || null,
      end_time: endTime || null,
    };
  }

  async updateDisposalTime(startTime: string | null, endTime: string | null) {
    // 검증: 둘 다 입력되거나 둘 다 null
    if ((startTime === null && endTime !== null) || (startTime !== null && endTime === null)) {
      throw new Error('Both start_time and end_time must be provided or both must be null');
    }

    // 시간 형식 검증 (HH:MM)
    if (startTime) {
      if (!/^\d{2}:\d{2}$/.test(startTime)) {
        throw new Error('Invalid time format. Please use HH:MM format');
      }
    }
    if (endTime) {
      if (!/^\d{2}:\d{2}$/.test(endTime)) {
        throw new Error('Invalid time format. Please use HH:MM format');
      }
    }

    let disposalSetting = await this.settingsRepository.findOneBy({ big: 6, sml: 1 });
    
    if (!disposalSetting) {
      disposalSetting = new Settings();
      disposalSetting.big = 6;
      disposalSetting.sml = 1;
      disposalSetting.name = 'disposal_time';
    }

    // 저장 형식: "hh:mm~hh:mm" 또는 null
    if (startTime && endTime) {
      disposalSetting.stringValue = `${startTime}~${endTime}`;
    } else {
      disposalSetting.stringValue = null;
    }

    await this.settingsRepository.save(disposalSetting);

    return {
      start_time: startTime,
      end_time: endTime,
      message: '그릇 수거 시간이 저장되었습니다.',
    };
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
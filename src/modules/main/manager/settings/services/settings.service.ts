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
}
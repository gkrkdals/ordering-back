import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { Order } from "@src/entities/order.entity";
import { dateToString, isSameDay } from "@src/utils/date";
import { SettingsSql } from "@src/modules/main/manager/settings/sql/settings.sql";
import { ExcelData } from "@src/types/models/ExcelData";
import { Settings } from "@src/entities/settings.entity";
import { Response } from "express";
import { createReadStream } from "fs";
import Path from "path";

function getTheme(isCancelled: boolean, isMenuZero?: boolean, alignRight?: boolean) {
  const theme: any = { font: {}, alignment: {} }

  if (isCancelled) {
    theme.font.color = { rgb: "FFAA0000" }
  }

  if(isMenuZero) {
    theme.font.bold = true;
  }

  if(alignRight) {
    theme.alignment.horizontal = "right";
  }

  return theme;
}

function getPathName(path: number | null): string {
  if (path === 1) {
    return '고객페이지';
  } else if (path === 2) {
    return '최고관리자 페이지'
  } else if (path === 3) {
    return '배달원 페이지';
  }

  return '';
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
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

  async getCalculation(params: GetCalculationDto) {
    const { menu, customer, type, start, end } = params;
    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(9, 0, 0, 0);
    if (isSameDay(startDate, endDate)) {
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate.setHours(8, 59, 59, 999);
    }

    const startString = dateToString(startDate);
    const endString = dateToString(endDate);

    const b = parseInt(type);

    let menuParam = null, customerParam = null;

    if (b === 2) {
      menuParam = menu;
    } else if (b === 3) {
      customerParam = customer;
    }

    const ordinaryData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getOrdinaryData,
      [startString, endString, customerParam, customerParam, menuParam, menuParam]
    );

    const extraData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getExtraData,
      [startString, endString]
    );

    console.log(extraData);

    const excelData: ExcelData[] = ordinaryData.concat([{
      customer_name: '',
      menu: '',
      menu_name: '',
      path: null,
      price: null,
      order_time: null,
      delivered_time: null,
      credit_by: '',
      credit_time: null,
      credit_in: null,
      memo: ''
    }]).concat(extraData);

    const data: any[][] = excelData.map((row, i) => {
      const p = getTheme(row.memo === '취소됨');
      const t = getTheme(row.memo === '취소됨', row.menu === 0);
      const q = getTheme(row.memo === '취소됨', row.menu === 0, true);



      return [
        { v: i + 1, t: "s", s: p },
        { v: row.customer_name, t: "s", s: p },
        { v: row.menu_name, t: "s", s: t },
        { v: row.price === null ? '' : parseInt(row.price), t: "n", s: q },
        { v: row.order_time === null ? '' : dateToString(new Date(row.order_time)), t: "s", s: p },
        { v: getPathName(row.path), t: "s", s: p },
        { v: row.delivered_time === null ? '' : dateToString(new Date(row.delivered_time)), t: "s", s: p },
        { v: row.credit_by ?? '', t: "s", s: p },
        { v: row.credit_time === null ? '' : dateToString(new Date(row.credit_time)), t: "s", s: p },
        { v: row.credit_in === null ? '' : parseInt(row.credit_in), t: "n", s: q },
        { v: row.memo, t: "s", s: p }
      ];
    });

    return data;
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
}
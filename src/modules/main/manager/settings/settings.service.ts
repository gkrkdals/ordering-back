import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { Order } from "@src/entities/order.entity";
import { dateToString, getYesterday } from "@src/utils/date";
import { SettingsSql } from "@src/modules/main/manager/settings/sql/settings.sql";
import { ExcelData } from "@src/types/models/ExcelData";

interface CalcXLSXColumns {
  고객명: string;
  메뉴: string;
  가격: number;
  시간: string;
  입금배달원: string;
  입금시간: string;
  입금액: number;
  잔금: number;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getCalculation(params: GetCalculationDto) {
    const { menu, customer, big, sml } = params;
    const now = new Date();
    const nowString = dateToString(now);

    const b = parseInt(big);
    const s = parseInt(sml);

    let menuParam = null, customerParam = null;
    let startTime: string;
    const endTime: string = nowString;

    if (b === 2) {
      menuParam = menu;
    } else if (b === 3) {
      customerParam = customer;
    }

    if (s === 1) {
      startTime = getYesterday(nowString);
    } else {
      if (s === 2) {
        now.setDate(now.getDate() - 7);
      } else {
        now.setMonth(now.getMonth() - 1);
      }
      now.setHours(9, 0, 0, 0);
      startTime = dateToString(now);
    }

    const excelData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getExcelData,
      [startTime, endTime, customerParam, customerParam, menuParam, menuParam]
    );

    const xlsxJson: CalcXLSXColumns[] = excelData.map(row => ({
      고객명: row.customer_name,
      메뉴: row.menu_name,
      가격: row.price,
      시간: row.time,
      입금배달원: row.credit_by,
      입금시간: row.credit_time,
      입금액: row.credit_in,
      잔금: row.credit_total
    }));

    return xlsxJson;
  }

  private getTitle(big: number, sml: number, additional?: string) {
    let title = ''

    if (sml === 1) {
      title = title.concat('일일 매출');
    } else if (sml === 2) {
      title = title.concat(`주 매출`);
    } else if (sml === 3) {
      title = title.concat('월 매출');
    }

    if (big === 2 || big === 3) {
      title = title.concat(`(${additional})`);
    }

    return title;
  }
}
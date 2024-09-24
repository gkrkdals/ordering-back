import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, Repository } from "typeorm";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { Order } from "@src/entities/order.entity";
import { dateToString, getYesterday } from "@src/utils/date";
import XLSX from "xlsx";
import { Customer } from "@src/entities/customer.entity";
import { Menu } from "@src/entities/menu.entity";

interface CalcXLSXColumns {
  고객명: string;
  메뉴: string;
  가격: number;
  시간: string;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async getCalculation(params: GetCalculationDto) {
    const { menu, customer } = params;
    const { big, sml } = params;
    const now = new Date();
    const nowString = dateToString(now);
    const where: FindOptionsWhere<Order> = {}
    let additional: string | undefined;

    const b = parseInt(big);
    const s = parseInt(sml);


    if (b === 2) {
      where.menu = menu;
      additional = (await this.menuRepository.findOneBy({ id: menu })).name;
    } else if (b === 3) {
      where.customer = customer;
      additional = (await this.customerRepository.findOneBy({ id: customer })).name;
    }

    const calcTitle = this.getTitle(b, s, additional);

    if (s === 1) {
      where.time = Between(getYesterday(nowString), nowString);
    } else {
      if (s === 2) {
        now.setDate(now.getDate() - 7);
      } else {
        now.setMonth(now.getMonth() - 1);
      }
      now.setHours(12, 0, 0, 0);
      where.time = Between(dateToString(now), nowString);
    }

    const orders = await this.orderRepository.find({
      where,
      relations: {
        menuJoin: true,
        customerJoin: true,
      }
    });

    const xlsxJson: CalcXLSXColumns[] = orders.map(order => ({
      고객명: order.customerJoin.name,
      메뉴: order.menuJoin.name,
      가격: order.price,
      시간: order.time,
    }));

    return { data: xlsxJson, title: calcTitle };
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
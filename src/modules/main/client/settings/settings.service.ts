import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Not, Repository } from "typeorm";
import { Settings } from "@src/entities/settings.entity";
import { createReadStream } from 'fs';
import * as Path from 'path';
import { Response } from "express";
import { dateToString, isSameDay } from "@src/utils/date";
import { Order } from "@src/entities/order/order.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { ClientSettingsSql } from "@src/modules/main/client/settings/client-settings.sql";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>,
  ) {}

  async updateShowPrice(customerId: number, value: 0 | 1) {
    const customer = await this.customerRepository.findOneBy({ id: customerId });
    customer.showPrice = value;
    await this.customerRepository.save(customer);
  }

  async updateHideOrderStatus(customerId: number, value: 0 | 1) {
    const customer = await this.customerRepository.findOneBy({ id: customerId });
    customer.hideOrderStatus = value;
    await this.customerRepository.save(customer);
  }

  async updateShowConfirm(customerId: number, value: 0 | 1) {
    const customer = await this.customerRepository.findOneBy({ id: customerId });
    customer.showConfirm = value;
    await this.customerRepository.save(customer);
  }

  async getStandardSettings() {
    return this.settingsRepository.findBy({ big: 2, sml: Not(1) });
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

  async getOrderHistory(customerId: number, startDate: string, endDate: string) {
    const [startString, endString] = this.getStartAndEnd(startDate, endDate);

    const result = await this.orderRepository.query(
      ClientSettingsSql.getOrderData,
      [
        startString, endString, customerId,
        startString, endString, customerId,
        startString, endString, customerId,
        startString, endString, startString, customerId,
      ]
    );

    result.forEach((order: any) => {
      if (order.order_time === '') {
        order.order_time = order.delivered_time
      }
    });

    result.sort((a, b) => {
      const d1 = new Date(a.order_time), d2 = new Date(b.order_time);
      if (d1 > d2) {
        return 1;
      } else if (d1 < d2) {
        return -1;
      }

      return 0;
    })

    return result;
  }

  async getCreditHistory(customerId: number, startDate: string, endDate: string) {
    const [startString, endString] = this.getStartAndEnd(startDate, endDate);
    const result = (await this.customerCreditRepository.query(ClientSettingsSql.getCreditHistory, [
      customerId, startString,
      customerId, startString, endString,
      customerId, startString, endString,
    ]))[0];

    // const misu = (await this.customerCreditRepository.query(
    //   "SELECT IFNULL(SUM(credit_diff), 0) * -1 AS credit FROM customer_credit WHERE customer = ? AND time <= ?",
    //   [customerId, startString]
    // ))[0].credit;

    // const ordered = (await this.orderRepository.query(
    //   `SELECT IFNULL(SUM(a.price), 0) AS price
    //    FROM \`order\` a
    //             LEFT JOIN (SELECT order_code,
    //                               MAX(status) status
    //                        FROM order_status
    //                        GROUP BY order_code) b ON a.id = b.order_code
    //    WHERE a.customer = ?
    //      AND (a.time BETWEEN ? AND ?)
    //      AND b.status != 8`,
    //   [customerId, startString, endString]
    // ))[0].price;

    // const charged = (await this.customerCreditRepository.query(
    //   "SELECT IFNULL(SUM(credit_diff), 0) AS credit FROM customer_credit WHERE customer = ? AND (time BETWEEN ? AND ?) AND (STATUS = 5 OR credit_diff > 0)",
    //   [customerId, startString, endString]
    // ))[0].credit;

    // const remaining = (await this.customerCreditRepository.query(
    //   "SELECT IFNULL(SUM(credit_diff), 0) * -1 AS credit FROM customer_credit WHERE customer = ? AND time <= ?",
    //   [customerId, endString]
    // ))[0].credit;

    return result;
  }

  private getStartAndEnd(startDate: string, endDate: string) {
    const start = new Date(startDate), end = new Date(endDate);

    start.setHours(9, 0, 0, 0);
    if (isSameDay(start, end)) {
      end.setHours(23, 59, 59, 999);
    } else {
      end.setDate(end.getDate() + 1);
      end.setHours(8, 59, 59, 999);
    }

    return [dateToString(start), dateToString(end)];
  }
}
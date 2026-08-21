import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Not, Repository } from "typeorm";
import { Settings } from "@src/entities/settings.entity";
import { createReadStream } from 'fs';
import * as Path from 'path';
import { Response } from "express";
import { getBusinessDayRange } from "@src/utils/date";
import { Order } from "@src/entities/order/order.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { ClientSettingsSql } from "@src/modules/main/client/settings/client-settings.sql";
import { POINT_USE_UNIT } from "@src/types/point";

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
    const [startString, endString] = getBusinessDayRange(startDate, endDate);
    console.log("history")

    const result = await this.orderRepository.query(
      ClientSettingsSql.getOrderData,
      [
        startString, endString, customerId,
        startString, endString, customerId,
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
    const [startString, endString] = getBusinessDayRange(startDate, endDate);
    const result = (await this.customerCreditRepository.query(ClientSettingsSql.getCreditHistory, [
      customerId, startString,
      customerId, startString, endString,
      customerId, startString, endString,
    ]))[0];

    return result;
  }

  async getMinUsePoint() {
    const setting = await this.settingsRepository.findOneBy({ big: 7, sml: 1 });
    if (!setting) {
      return 3000;
    }
    return setting.value ?? 3000;
  }

  /**
   * 적립금 사용 정책을 조회합니다. 사용 단위는 1,000원 고정입니다. 두 값 모두 원 단위입니다.
   */
  async getPointUsePolicy() {
    const minSetting = await this.settingsRepository.findOneBy({ big: 7, sml: 1 });

    return {
      minUsePoint: minSetting ? (minSetting.value ?? 3000) : 3000,
      useUnit: POINT_USE_UNIT,
    };
  }
}
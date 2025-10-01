import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { Like, Not, Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Order } from "@src/entities/order/order.entity";
import { RecentMenu } from "@src/types/models/RecentMenu";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";
import { CustomerPrice } from "@src/entities/customer-price";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu) private menuRepository: Repository<Menu>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(DiscountGroup)
    private discountGroupRepository: Repository<DiscountGroup>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(CustomerPrice)
    private customerPriceRepository: Repository<CustomerPrice>,
  ) {}

  async findAll(customer: Customer): Promise<Menu[]> {
    const groupId: number | null = customer.discountGroupId;
    const webDiscountValue = (await this.settingsRepository.findOneBy({ big: 5, sml: 1 })).value ?? 0;
    const customPricesArray = await this.customerPriceRepository.findBy({ customer: customer.id });
    const customPrices: any = {};

    let type: 'amount' | 'percent' | '' = '', value = 0;

    // 커스텀 가격 설정
    customPricesArray.forEach((item) => {
      customPrices[item.category] = item.price;
    });

    // 할인 그룹에 속해있으면 할인 타입과 금액 설정
    if (groupId) {
      const group = await this.discountGroupRepository.findOneBy({ id: groupId });
      if (group) {
        type = group.discountType;
        value = group.discountValue;
      }
    }

    // 데이터 찾아옴
    const data = await this.menuRepository.find({
      relations: { menuCategory: true },
      where: {
        id: Not(0),
        withdrawn: Not(1)
      },
      order: {
        seq: 'asc',
      }
    });

    // 커스텀 가격 적용
    data.forEach((item) => {
      const customPrice = customPrices[item.category];
      if (customPrice) {
        item.menuCategory.price = customPrice;
      }
    })

    // 할인 그룹에 있을 시 할인 타입에 따라 할인
    if (type === 'amount') {
      data.forEach(item => {
        if (item.isDiscountable === 1) {
          item.menuCategory.price -= value
        }
      });
    } else if (type === 'percent') {
      data.forEach(item => {
        if (item.isDiscountable === 1) {
          item.menuCategory.price *= ((100 - value) * 0.01);
        }
      })
    }

    // 웹할인 가격만큼 할인
    data.forEach(item => {
      if (item.isDiscountable === 1) {
        item.menuCategory.price -= webDiscountValue;
      }
    });

    return data;
  }

  findOne(id: number): Promise<Menu | null> {
    return this.menuRepository.findOneBy({ id });
  }

  findByName(name: string): Promise<Menu[]> {

    return this.menuRepository.findBy({
      name: Like(`%${name}%`)
    })
  }

  async findRecentMenus(customer: Customer) {
    return (await this.orderRepository.find({
      where: { customer: customer.id },
      relations: {
        menuJoin: {
          menuCategory: true
        }
      },
      take: 4,
      order: { id: 'desc' }
    }))
      .map<RecentMenu>(order => ({
        ...order.menuJoin,
        id: order.id,
        time: order.time
      }));
  }
}
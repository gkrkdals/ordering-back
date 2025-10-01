import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { Like, Not, Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Order } from "@src/entities/order/order.entity";
import { RecentMenu } from "@src/types/models/RecentMenu";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu) private menuRepository: Repository<Menu>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(DiscountGroup)
    private discountGroupRepository: Repository<DiscountGroup>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>
  ) {}

  async findAll(customer: Customer): Promise<Menu[]> {
    const groupId: number | null = customer.discountGroupId;
    const webDiscountValue = (await this.settingsRepository.findOneBy({ big: 5, sml: 1 })).value ?? 0;
    let type: 'amount' | 'percent' | '' = '', value = 0;

    if (groupId) {
      const group = await this.discountGroupRepository.findOneBy({ id: groupId });
      if (group) {
        type = group.discountType;
        value = group.discountValue;
      }
    }

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

    data.forEach(item => {
      item.menuCategory.price -= webDiscountValue;
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
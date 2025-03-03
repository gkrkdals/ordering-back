import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { Like, Not, Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Order } from "@src/entities/order/order.entity";
import { RecentMenu } from "@src/types/models/RecentMenu";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu) private menuRepository: Repository<Menu>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
  ) {}

  findAll(): Promise<Menu[]> {
    return this.menuRepository.find({
      relations: { menuCategory: true },
      where: {
        id: Not(0),
        withdrawn: Not(1)
      },
      order: {
        seq: 'asc',
      }
    });
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
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { Like, Not, Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Order } from "@src/entities/order/order.entity";
import { RecentMenu } from "@src/types/models/RecentMenu";
import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";
import { applyMenuPrices, applySoldOut } from "@src/utils/price";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu) private menuRepository: Repository<Menu>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  async findAll(customer: Customer): Promise<Menu[]> {
    // 가격·품절 모두 그룹 > 전역 순으로 해석된다 (utils/price.ts)
    const [priceContext, soldOutMap] = await Promise.all([
      this.customerSettingsService.loadPriceContext(customer),
      this.customerSettingsService.loadSoldOutMap(customer),
    ]);

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

    applyMenuPrices(data, priceContext);
    applySoldOut(data, soldOutMap, customer.isSoldOut);

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
      where: { 
        customer: customer.id,
        menuJoin: {
          id: Not(0),
          withdrawn: Not(1),
        }
      },
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
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { DataSource, LessThan, Not, Repository } from "typeorm";
import { OrderedMenuDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { Order } from "@src/entities/order.entity";
import { Customer } from "@src/entities/customer.entity";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderSql } from "@src/modules/main/client/order/sql/OrderSql";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { CustomerPrice } from "@src/entities/customer-price";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { getOrderAvailableTimes } from "@src/utils/date";
import { Menu } from "@src/entities/menu.entity";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderStatus)
    private orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectDataSource()
    private readonly datasource: DataSource,
    private readonly orderGateway: OrderGateway,
    private readonly fcmService: FirebaseService
  ) {}

  getOrderCategories(): Promise<OrderCategory[]> {
    return this.orderCategoryRepository.findBy({ status: LessThan(StatusEnum.AwaitingPickup) });
  }

  async getRecentRequests(customer: Customer) {
    const recentRequests = await this.orderRepository.find({
      where: {
        customer: customer.id,
        request: Not('')
      },
      order: { id: 'desc' },
      take: 2
    });
    return recentRequests.map(req => req.request);
  }

  async getLastOrders(customer: Customer) {
    const recentMenuOnDigit: { id: number; menu: number }[] = await this.orderRepository.query(
      'SELECT MAX(id) AS id, menu FROM `order` WHERE customer = ? AND menu != 0 GROUP BY menu ORDER BY id DESC LIMIT 4',
      [customer.id]
    );

    const recentMenus: Menu[] = [];

    for (const menuKey of recentMenuOnDigit) {
      const menu = await this.menuRepository.findOne({
        where: {
          id: menuKey.menu
        },
        relations: {
          menuCategory: true
        }
      });
      recentMenus.push(menu);
    }

    return recentMenus
  }

  async getCredit(customer: Customer) {
    const result = await this.customerCreditRepository
      .createQueryBuilder()
      .select('SUM(credit_diff)', 'credit')
      .where('customer = :customer', { customer: customer.id })
      .groupBy('customer')
      .getRawOne<{ credit: string }>();
    console.log(result);

    return parseInt(result.credit);
  }

  async getSummaryCount() {
    const [first, last] = getOrderAvailableTimes();
    return this.orderStatusRepository.query(OrderSql.getOrderStatusCounts, [first, last, StatusEnum.AwaitingPickup]);
  }

  getOrderSummaries(customer: Customer): Promise<OrderSummaryResponseDto[]> {
    const [first, last] = getOrderAvailableTimes();
    return this.datasource.query(OrderSql.getOrderStatus, [customer.id, first, last]);
  }

  async addOrder(customer: JwtCustomer, orderedMenus: OrderedMenuDto[]): Promise<void> {
    const customPrices = await this.customerPriceRepository.findBy({ customer: customer.id });

    for(const orderedMenu of orderedMenus) {
      const newOrder = new Order();
      const currentMenu = await this.menuRepository.findOneBy({ id: orderedMenu.menu.id });

      // 메뉴가 품절이 된 경우
      if (currentMenu.soldOut === 1) {
        throw new BadRequestException();
      } else {
        if (orderedMenu.menu.id === 0) {
          newOrder.memo = orderedMenu.menu.name;
          newOrder.price = 0;
        } else {
          const customPrice = customPrices.find(price => price.category === orderedMenu.menu.category);

          if(customPrice) {
            newOrder.price = customPrice.price;
          } else {
            newOrder.price = orderedMenu.menu.menuCategory.price;
          }
        }

        newOrder.path = null;
        newOrder.customer = customer.id;
        newOrder.menu = orderedMenu.menu.id;
        newOrder.request = orderedMenu.request;
        await this.orderRepository.save(newOrder);
      }
    }

    this.orderGateway.newOrder();
    await this.fcmService.newOrder();
    this.orderGateway.refresh();
    this.orderGateway.refreshClient();
  }
}
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { Order } from "@src/entities/order.entity";
import { UserType } from "@src/types/UserType";
import { OrderSql } from "@src/modules/main/manager/order/sql/order.sql";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { OrderStatusRaw } from "@src/types/models/OrderStatusRaw";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { OrderCategory } from "@src/entities/order-category.entity";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { OrderGateway } from "@src/websocket/order.gateway";
import { Pending } from "@src/types/models/Pending";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderCategory)
    private readonly orderCategoryRepository: Repository<OrderCategory>,

    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,

    private readonly orderGateway: OrderGateway,
  ) {}

  async pendingStatusForManager(user: UserType) {
    const pending: Pending[] = await this.orderStatusRepository.query(OrderSql.getRemainingPendingRequestCount);

    const cookPending = pending.some(p => p.status === StatusEnum.PendingReceipt);
    const riderPending = pending.some(p => p.status === StatusEnum.WaitingForDelivery || p.status === StatusEnum.AwaitingPickup);

    return (user === 'cook' && cookPending) || (user === 'rider' && riderPending);
  }

  async getOrders(page: number, query: string, user: UserType): Promise<GetOrderResponseDto> {
    const like = `%${query}%`;
    const likes = new Array(5).fill(like);

    const [firstStatus, lastStatus] = this.getFirstAndLastStatus(user);

    const data: OrderStatusRaw[] = await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatus, [...likes, firstStatus, lastStatus, countSkip(page)]);

    const { count } = (await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatusCount, [...likes, firstStatus, lastStatus]))[0];

    // 각 주문 상태에 잔금 매핑
    for (const status of data) {
      status.credit = parseInt(
        (await this
          .orderStatusRepository
          .query(
            `SELECT IFNULL(customer, ?), IFNULL(SUM(credit_diff), 0) credit FROM customer_credit WHERE customer = ?`,
            [status.customer, status.customer]
          ))
          .at(0)
          .credit
      );
    }

    return {
      data,
      currentPage: page,
      totalPage: countToTotalPage(count)
    }
  }

  async getOrderCategories() {
    return this.orderCategoryRepository.find();
  }

  async getOrderHistory(orderCode: number) {
    return this.orderStatusRepository.find({ where: { orderCode }, order: { time: "asc" } });
  }

  async createNewOrder(menu: Menu, customer: Customer) {
    const newOrder = new Order();
    const customPrices = await this.customerPriceRepository.findBy({ customer: customer.id });

    if (menu.id === 0) {
      newOrder.price = 0;
    } else {
      const customPrice = customPrices.find(price => price.category === menu.category);

      if(customPrice) {
        newOrder.price = customPrice.price + 1000;
      } else {
        newOrder.price = menu.menuCategory.price + 1000;
      }
    }

    newOrder.customer = customer.id;
    newOrder.menu = menu.id;
    await this.orderRepository.save(newOrder);

    this.orderGateway.refreshClient();
    this.orderGateway.refresh();
    this.orderGateway.newEventCook();
  }

  private getFirstAndLastStatus(user: UserType) {
    switch (user) {
      case 'manager':
      case 'rider':
        return [StatusEnum.PendingReceipt, StatusEnum.InPickingUp];

      case "cook":
        return [StatusEnum.PendingReceipt, StatusEnum.InPreparation];
    }
  }
}
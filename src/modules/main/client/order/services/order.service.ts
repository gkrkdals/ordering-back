import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { DataSource, LessThan, Repository } from "typeorm";
import { OrderedMenuDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { Order } from "@src/entities/order.entity";
import { Customer } from "@src/entities/customer.entity";
import { Status } from "@src/types/enum/Status";
import { OrderSql } from "@src/modules/main/client/order/sql/OrderSql";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { OrderGateway } from "@src/websocket/order.gateway";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly datasource: DataSource,
    private readonly orderGateway: OrderGateway,
  ) {}

  getOrderCategories(): Promise<OrderCategory[]> {
    return this.orderCategoryRepository.findBy({ status: LessThan(Status.AwaitingPickup) });
  }

  getOrderSummaries(customer: Customer): Promise<OrderSummaryResponseDto[]> {
    return this.datasource.query(OrderSql.getOrderStatus, [customer.id]);
  }

  async addOrder(customer: Customer, orderedMenus: OrderedMenuDto[]): Promise<void> {
    for(const orderedMenu of orderedMenus) {
      const newOrder = new Order();

      if (orderedMenu.menu.id === 0) {
        newOrder.memo = orderedMenu.menu.name;
        newOrder.price = 0;
      } else {
        newOrder.price = orderedMenu.menu.menuCategory.price;
      }

      newOrder.customer = customer.id;
      newOrder.menu = orderedMenu.menu.id;
      newOrder.request = orderedMenu.request;
      await this.orderRepository.save(newOrder);
    }

    this.orderGateway.broadcastEvent('refresh_manager');
  }
}
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

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly datasource: DataSource
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
      newOrder.customer = customer.id;
      newOrder.menu = orderedMenu.menu.id;
      newOrder.request = orderedMenu.request;
      newOrder.price = orderedMenu.menu.foodCategory.price;
      await this.orderRepository.save(newOrder);
    }
  }
}
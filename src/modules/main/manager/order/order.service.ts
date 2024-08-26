import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { Order } from "@src/entities/order.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { Status } from "@src/types/enum/Status";
import { OrderSql } from "@src/modules/main/manager/order/sql/order.sql";
import { OrderStatusRaw } from "@src/types/models/OrderStatusRaw";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderCategory)
    private readonly orderCategoryRepository: Repository<OrderCategory>
  ) {}

  async getOrders(page: number, query: string): Promise<GetOrderResponseDto> {
    const like = `%${query}%`;

    const data: OrderStatusRaw[] = await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatus, new Array(5).fill(like).concat(countSkip(page)));
    const { count } = (await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatusCount, new Array(5).fill(like)))[0];

    return {
      data,
      currentPage: page,
      totalPage: countToTotalPage(count)
    }
  }

  async getOrderCategories() {
    return this.orderCategoryRepository.find();
  }

  async createNewOrder(menu: Menu[], customer: Customer) {
    console.log(menu)
    for(const orderedMenu of menu) {
      const newOrder = new Order();
      newOrder.price = orderedMenu.foodCategory.price + 1000;
      newOrder.customer = customer.id;
      newOrder.menu = orderedMenu.id;
      console.log(await this.orderRepository.save(newOrder));
    }
  }

  async updateOrder(order: OrderStatusRaw) {
    const updatedOrder = new OrderStatus();

    updatedOrder.status = order.status;
    updatedOrder.orderCode = order.order_code;
    updatedOrder.time = order.time;

    await this.orderStatusRepository.save(updatedOrder);
  }

  async cancelOrder(id: number) {
    const canceledOrder = await this.orderStatusRepository.findOne({
      where: { id },
    });
    const newOrderStatus = new OrderStatus();

    newOrderStatus.orderCode = canceledOrder.orderCode;
    newOrderStatus.status = Status.Canceled;

    await this.orderStatusRepository.save(newOrderStatus);
  }
}
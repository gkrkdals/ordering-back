import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { Order } from "@src/entities/order.entity";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getOrders(page: number): Promise<GetOrderResponseDto> {
    const [data, count] = await this.orderStatusRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
      relations: {
        orderJoin: {
          menuJoin: true,
          customerJoin: true
        },
        statusJoin: true,
      },
    });

    return {
      data,
      currentPage: page,
      totalPage: countToTotalPage(count)
    }
  }

  async createNewOrder(menu: Menu[], customer: Customer) {
    for(const orderedMenu of menu) {
      const newOrder = new Order();
      newOrder.price = orderedMenu.foodCategory.price + 1000;
      newOrder.customer = customer.id;
      newOrder.menu = orderedMenu.id;
      await this.orderRepository.save(newOrder);
    }
  }
}
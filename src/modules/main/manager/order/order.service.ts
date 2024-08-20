import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Like, Repository } from "typeorm";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { Order } from "@src/entities/order.entity";
import { OrderCategory } from "@src/entities/order-category.entity";

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
    const like = Like(`%${query}%`);
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
      where: [
        { orderJoin: { customerJoin: { name: like } } },
        { orderJoin: { menuJoin: { name: like } } },
        { orderJoin: { request: like } },
        { statusJoin: { statusName: like } }
      ]
    });

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
    for(const orderedMenu of menu) {
      const newOrder = new Order();
      newOrder.price = orderedMenu.foodCategory.price + 1000;
      newOrder.customer = customer.id;
      newOrder.menu = orderedMenu.id;
      await this.orderRepository.save(newOrder);
    }
  }

  async updateOrder(order: OrderStatus) {
    const updatedOrder = await this.orderStatusRepository.findOne({
      where: {id: order.id},
      relations: {
        orderJoin: {
          menuJoin: true,
          customerJoin: true
        },
        statusJoin: true,
      }
    });

    updatedOrder.status = order.status;
    updatedOrder.orderJoin.price = order.orderJoin.price;
    await this.orderRepository.save(updatedOrder, {  });
  }
}
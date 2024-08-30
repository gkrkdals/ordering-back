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
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";
import { CustomerCredit } from "@src/entities/customer-credit.entity";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderCategory)
    private readonly orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>
  ) {}

  async getOrders(page: number, query: string): Promise<GetOrderResponseDto> {
    const like = `%${query}%`;

    const data: OrderStatusRaw[] = await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatus, new Array(5).fill(like).concat(countSkip(page)));

    const { count } = (await this
      .orderStatusRepository
      .query(OrderSql.getOrderStatusCount, new Array(5).fill(like)))[0];

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

  async createNewOrder(menu: Menu, customer: Customer) {
    const newOrder = new Order();

    if (menu.id === 0) {
      newOrder.price = 0;
      newOrder.memo = menu.name;
    } else {
      newOrder.price = menu.menuCategory.price + 1000;
    }

    newOrder.customer = customer.id;
    newOrder.menu = menu.id;
    await this.orderRepository.save(newOrder)
  }

  async updateOrder(order: UpdateOrderDto) {
    const currentOrderStatus = await this.orderStatusRepository.findOne({
      where: { id: order.orderId },
      relations: { orderJoin: true, }
    });

    const updatedOrder = new OrderStatus();
    updatedOrder.status = order.newStatus;
    updatedOrder.orderCode = currentOrderStatus.orderCode;

    if(order.newStatus === Status.InPreparation && order.menu === 0) {
      const originalOrder = await this.orderRepository.findOneBy({ id: currentOrderStatus.orderCode });
      originalOrder.price = order.paidAmount;
      await this.orderRepository.save(originalOrder);

      const newCreditInfo = new CustomerCredit();
      newCreditInfo.creditDiff = order.paidAmount * -1;
      newCreditInfo.customer = currentOrderStatus.orderJoin.customer;

      await this.customerCreditRepository.save(newCreditInfo);

    } else if(order.newStatus === Status.AwaitingPickup && !order.postpaid) {
        const newCreditInfo = new CustomerCredit();
        newCreditInfo.creditDiff = order.paidAmount;
        newCreditInfo.customer = currentOrderStatus.orderJoin.customer;

        await this.customerCreditRepository.save(newCreditInfo);
    }

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
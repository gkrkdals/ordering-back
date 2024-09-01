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
import { OrderGateway } from "@src/websocket/order.gateway";
import { Interval } from "@nestjs/schedule";

interface Pending {
  status: number;
  count: string;
}

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
    private readonly customerCreditRepository: Repository<CustomerCredit>,
    private readonly orderGateway: OrderGateway,
  ) {}

  async getOrders(page: number, query: string, user: 'manager' | 'rider' | 'cook'): Promise<GetOrderResponseDto> {
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
    await this.orderRepository.save(newOrder);

    this.orderGateway.broadcastEvent('refresh_client');
    this.orderGateway.broadcastEvent('refresh');
  }

  /**
   * 주문을 업데이트합니다.
   *
   * 주문이 업데이트 될 시,
   * 조리원이나 배달원의 알람이 울리거나 취소되도록 합니다.
   * @param order 주문정보
   */
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

    if (order.newStatus === Status.WaitingForDelivery || order.newStatus === Status.AwaitingPickup) {
      this.orderGateway.broadcastEvent('new_event_rider');
    }

    this.orderGateway.broadcastEvent('refresh_client');
    this.orderGateway.broadcastEvent('refresh');

    // 전부 조리중으로 바뀌면 벨 울리기 취소
    await this.cancelRingingIfNoPending();
  }

  /**
   * 주문을 취소합니다.
   *
   * @param id 클라이언트에서 받아온 주문정보의 id
   */
  async cancelOrder(id: number) {
    const canceledOrder = await this.orderStatusRepository.findOne({
      where: { id },
    });
    const newOrderStatus = new OrderStatus();

    newOrderStatus.orderCode = canceledOrder.orderCode;
    newOrderStatus.status = Status.Canceled;

    await this.orderStatusRepository.save(newOrderStatus);
    this.orderGateway.broadcastEvent('refresh_client');
    this.orderGateway.broadcastEvent('refresh');
  }

  private getFirstAndLastStatus(user: 'manager' | 'rider' | 'cook') {
    switch (user) {
      case 'manager':
        return [Status.PendingReceipt, Status.InPickingUp];

      case 'rider':
        return [Status.WaitingForDelivery, Status.InPickingUp];

      case "cook":
        return [Status.PendingReceipt, Status.InPreparation];
    }
  }

  /**
   * 조리원이나 배달원에게 대기 중인 정보가 있는지 확인하고, 없으면 지속적으로 울리는 알림을 해제합니다.
   *
   * @private
   */
  private async cancelRingingIfNoPending() {
    const pendingArray: Pending[] = await this.orderStatusRepository.query(OrderSql.getRemainingPendingRequestCount);
    const pendingCook = pendingArray.find(pending => pending.status === Status.PendingReceipt);
    const pendingRider = pendingArray
      .find(pending => pending.status === Status.WaitingForDelivery || pending.status === Status.AwaitingPickup);

    if (!pendingCook || parseInt(pendingCook.count) === 0) {
      this.orderGateway.broadcastEvent('remove_event_cook');
    }

    if (!pendingRider || parseInt(pendingRider.count) === 0) {
      this.orderGateway.broadcastEvent('remove_event_rider');
    }
  }
}
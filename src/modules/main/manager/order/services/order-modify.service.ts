import { Injectable } from "@nestjs/common";
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { LessThan, Repository } from "typeorm";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { Order } from "@src/entities/order.entity";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { OrderGateway } from "@src/websocket/order.gateway";
import { Pending } from "@src/types/models/Pending";
import { OrderSql } from "@src/modules/main/manager/order/sql/order.sql";
import { UpdateOrderMenuDto } from "@src/modules/main/manager/order/dto/update-order-menu.dto";
import { OrderChange } from "@src/entities/order-change.entity";
import { User } from "@src/entities/user.entity";
import { getOrderStatusTimes } from "@src/utils/date";

@Injectable()
export class OrderModifyService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>,
    @InjectRepository(OrderChange)
    private readonly orderChangeRepository: Repository<OrderChange>,

    private readonly orderGateway: OrderGateway
  ) {}

  /**
   * 주문을 업데이트합니다.
   *
   * 주문이 업데이트 될 시,
   * 조리원이나 배달원의 알람이 울리거나 취소되도록 합니다.
   * @param order 주문정보
   */
  async updateOrder(order: UpdateOrderDto) {
    // 상태변경을 일으킨 주문상태의 엔티티를 받아옴
    const currentOrderStatus = await this.orderStatusRepository.findOne({
      where: { id: order.orderId },
      relations: { orderJoin: true, }
    });

    // 새 주문상태 엔티티 생성, 새로운 주문상태와 해당 주문 코드 매핑
    const newOrderStatus = new OrderStatus();
    newOrderStatus.status = order.newStatus;
    newOrderStatus.orderCode = currentOrderStatus.orderCode;

    // 관리자 메뉴에서 추가메뉴 항목의 상태를 조리중으로 변경 시 받아온 메뉴명/금액 적용
    if(order.newStatus === StatusEnum.InPreparation && order.menu === 0) {
      const originalOrder = await this.orderRepository.findOneBy({ id: currentOrderStatus.orderCode });
      originalOrder.price = order.paidAmount;
      await this.orderRepository.save(originalOrder);

      const newCreditInfo = new CustomerCredit();
      newCreditInfo.orderCode = currentOrderStatus.orderCode;
      newCreditInfo.creditDiff = order.paidAmount * -1;
      newCreditInfo.customer = currentOrderStatus.orderJoin.customer;

      await this.customerCreditRepository.save(newCreditInfo);

    } else if(order.newStatus === StatusEnum.AwaitingPickup && !order.postpaid) { // 음식 수령 후 금액을 바로 지불하였을 시 저장
      const newCreditInfo = new CustomerCredit();
      newCreditInfo.orderCode = currentOrderStatus.orderCode;
      newCreditInfo.creditDiff = order.paidAmount;
      newCreditInfo.customer = currentOrderStatus.orderJoin.customer;

      await this.customerCreditRepository.save(newCreditInfo);
    }

    await this.orderStatusRepository.save(newOrderStatus);

    if (order.newStatus === StatusEnum.WaitingForDelivery) {
      this.orderGateway.newEventRider();
    }
    this.orderGateway.refreshClient();
    this.orderGateway.refresh();

    // 전부 조리중으로 바뀌면 벨 울리기 취소
    await this.cancelRingingIfNoPending();
  }

  async updateOrderMenu(body: UpdateOrderMenuDto, user: User) {
    const { orderCode, from, to, price } = body;

    const currentOrder = await this.orderRepository.findOneBy({ id: orderCode });
    currentOrder.menu = to;
    await this.orderRepository.save(currentOrder);

    const newOrderChange = new OrderChange();
    newOrderChange.orderCode = orderCode;
    newOrderChange.from = from;
    newOrderChange.to = to;
    newOrderChange.by = user.id;
    await this.orderChangeRepository.save(newOrderChange);

    await this.customerCreditRepository.delete({
      orderCode: orderCode,
      creditDiff: LessThan(0)
    });

    const newDebt = new CustomerCredit();
    newDebt.customer = currentOrder.customer;
    newDebt.orderCode = orderCode;
    newDebt.creditDiff = price * -1;
    await this.customerCreditRepository.save(newDebt);
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
    newOrderStatus.status = StatusEnum.Canceled;

    await this.orderStatusRepository.save(newOrderStatus);
    this.orderGateway.refreshClient();
    this.orderGateway.refresh();
  }

  /**
   * 조리원이나 배달원에게 대기 중인 정보가 있는지 확인하고, 없으면 지속적으로 울리는 알림을 해제합니다.
   *
   * @private
   */
  private async cancelRingingIfNoPending() {
    const [firstDate, lastDate] = getOrderStatusTimes();
    const pendingArray: Pending[] = await this.orderStatusRepository.query(
      OrderSql.getRemainingPendingRequestCount,
      [firstDate, lastDate, StatusEnum.PendingReceipt, StatusEnum.WaitingForDelivery]
    );
    const pendingCook = pendingArray.find(pending => pending.status === StatusEnum.PendingReceipt);
    const pendingRider = pendingArray
      .find(pending => pending.status === StatusEnum.PendingReceipt || pending.status === StatusEnum.WaitingForDelivery);

    if (!pendingCook || parseInt(pendingCook.count) === 0) {
      this.orderGateway.removeEventCook();
      this.orderGateway.removeEventRider();
    }

    if (!pendingRider || parseInt(pendingRider.count) === 0) {
      this.orderGateway.removeEventRider();
    }
  }
}
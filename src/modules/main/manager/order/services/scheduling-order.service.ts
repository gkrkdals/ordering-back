import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { dateToString, getOrderAvailableTimes } from "@src/utils/date";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderStatus } from "@src/entities/order-status.entity";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { OrderSql } from "@src/modules/main/manager/order/sql/order.sql";
import { FirebaseService } from "@src/modules/firebase/firebase.service";

@Injectable()
export class SchedulingOrderService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,

    private readonly orderGateway: OrderGateway,
    private readonly fcmService: FirebaseService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    const [first, last] = getOrderAvailableTimes();
    const nowString = dateToString(new Date());
    const settings = await this.settingsRepository.findBy([
      { id: 1 },
      { id: 2 }
    ]);
    const cookExceededTime = settings[0].value ?? 0;
    const deliverExceededTime = settings[1].value ?? 0;

    const currentOrderStatus: { order_code: number; status: number; }[] =
      await this.orderStatusRepository.query(
        OrderSql.getOrdersExceeded,
        [first, last, cookExceededTime, nowString, StatusEnum.InPreparation, deliverExceededTime, nowString, StatusEnum.InDelivery]
      );

    if (currentOrderStatus.some(orderStatus => orderStatus.status === StatusEnum.InPreparation)) {
      this.orderGateway.cookingExceeded();
      await this.fcmService.cookingExceeded();
    }

    if (currentOrderStatus.some(orderStatus => orderStatus.status === StatusEnum.InDelivery)) {
      this.orderGateway.deliverDelayed();
      await this.fcmService.deliverDelayed();
    }
  }
}
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GLOBAL_GROUP_ID, Settings } from "@src/entities/settings.entity";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { dateToString, getOrderAvailableTimes } from "@src/utils/date";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderStatus } from "@src/entities/order/order-status.entity";
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
    // 조리·배달 초과시간은 주방/배달이 하나뿐이라 전역 설정만 쓴다 ([0]=조리, [1]=배달)
    const settings = await this.settingsRepository.find({
      where: { big: 1, groupId: GLOBAL_GROUP_ID },
      order: { sml: 'ASC', id: 'ASC' },
    });
    const cookExceededTime = settings[0]?.value ?? 0;
    const deliverExceededTime = settings[1]?.value ?? 0;

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
import { BadRequestException, Injectable } from "@nestjs/common";
import { Customer } from "@src/entities/customer/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order/order-status.entity";
import { Repository } from "typeorm";
import { CreateDishDisposalDto } from "@src/modules/main/client/order/dto/create-dish-disposal.dto";
import { DisposalSql } from "@src/modules/main/client/order/sql/DisposalSql";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { Disposal } from "@src/types/models/Disposal";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";
import { Settings } from "@src/entities/settings.entity";

@Injectable()
export class DishDisposalService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,

    private readonly orderGateway: OrderGateway,
    private readonly fcmService: FirebaseService,
  ) {}

  async getDishDisposals(customer: Customer): Promise<Disposal[]> {
    return this.orderStatusRepository.query(
      DisposalSql.getDisposals,
      [StatusEnum.AwaitingPickup, StatusEnum.InPickingUp, customer.id]
    );
  }

  async createDishDisposal(customer: Customer, body: CreateDishDisposalDto) {
    // 그릇수거 가능 시간 검증
    await this.validateDisposalTime();

    const newOrderStatus = new OrderStatus();
    const { disposal, location } = body;
    newOrderStatus.orderCode = disposal.order_code;
    newOrderStatus.status = StatusEnum.InPickingUp;
    newOrderStatus.location = location;

    await this.orderStatusRepository.save(newOrderStatus);
    
    const bowlPoint = new PointHistory();
    bowlPoint.customerId = customer.id;
    bowlPoint.orderId = disposal.order_code;
    bowlPoint.amount = customer.rewardPerBowl;
    bowlPoint.pathType = PointEnum.BOWL;
    bowlPoint.description = "그릇수거 적립금";

    await this.orderStatusRepository.manager.save(bowlPoint);

    
    const currentCustomer = await this.customerRepository.findOne({ where: { id: customer.id } });
    currentCustomer.pointBalance += currentCustomer.rewardPerBowl;
    
    await this.orderStatusRepository.manager.save(currentCustomer);
    

    this.orderGateway.newDishDisposal();
    await this.fcmService.newDishDisposal();

    this.orderGateway.refresh();
  }

  /**
   * 관리자가 설정한 그릇수거 가능 시간 범위를 검증합니다.
   * 설정값이 없으면 항상 허용합니다.
   */
  private async validateDisposalTime(): Promise<void> {
    const disposalSetting = await this.settingsRepository.findOneBy({ big: 6, sml: 1 });

    if (!disposalSetting || !disposalSetting.stringValue) {
      return; // 설정값 없으면 항상 허용
    }

    const [startTime, endTime] = disposalSetting.stringValue.split('~');
    if (!startTime || !endTime) {
      return; // 파싱 실패 시 항상 허용
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let isWithinRange: boolean;
    if (startMinutes <= endMinutes) {
      // 같은 날 범위 (예: 09:00~18:00)
      isWithinRange = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // 자정을 넘기는 범위 (예: 22:00~06:00)
      isWithinRange = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    if (!isWithinRange) {
      throw new BadRequestException(
        `그릇 수거 요청은 ${startTime} ~ ${endTime} 사이에만 가능합니다.`
      );
    }
  }
}
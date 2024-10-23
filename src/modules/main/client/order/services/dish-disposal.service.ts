import { Injectable } from "@nestjs/common";
import { Customer } from "@src/entities/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { CreateDishDisposalDto } from "@src/modules/main/client/order/dto/create-dish-disposal.dto";
import { DisposalSql } from "@src/modules/main/client/order/sql/DisposalSql";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderGateway } from "@src/socket/order.gateway";
import { Disposal } from "@src/types/models/Disposal";
import { FirebaseService } from "@src/firebase/firebase.service";

@Injectable()
export class DishDisposalService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    private readonly orderGateway: OrderGateway,
    private readonly fcmService: FirebaseService,
  ) {}

  async getDishDisposals(customer: Customer): Promise<Disposal[]> {
    return this.orderStatusRepository.query(
      DisposalSql.getDisposals,
      [StatusEnum.AwaitingPickup, StatusEnum.InPickingUp, customer.id]
    );
  }

  async createDishDisposal(body: CreateDishDisposalDto) {
    const newOrderStatus = new OrderStatus();
    const { disposal, location } = body;
    newOrderStatus.orderCode = disposal.order_code;
    newOrderStatus.status = StatusEnum.InPickingUp;
    newOrderStatus.location = location;

    await this.orderStatusRepository.save(newOrderStatus);

    this.orderGateway.newDishDisposal();
    await this.fcmService.newDishDisposal();
    this.orderGateway.refresh();
  }
}
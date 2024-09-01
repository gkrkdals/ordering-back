import { Injectable } from "@nestjs/common";
import { Customer } from "@src/entities/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { CreateDishDisposalDto } from "@src/modules/main/client/order/dto/create-dish-disposal.dto";
import { DisposalSql } from "@src/modules/main/client/order/sql/DisposalSql";
import { Status } from "@src/types/enum/Status";
import { OrderGateway } from "@src/websocket/order.gateway";
import { Disposal } from "@src/types/models/disposal";

@Injectable()
export class DishDisposalService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
    private readonly orderGateway: OrderGateway,
  ) {}

  async getDishDisposals(customer: Customer): Promise<Disposal[]> {
    return this.orderStatusRepository.query(DisposalSql.getDisposals, [customer.id]);
  }

  async createDishDisposal(body: CreateDishDisposalDto) {
    const newOrderStatus = new OrderStatus();
    const { disposal, location } = body;
    newOrderStatus.orderCode = disposal.order_code;
    newOrderStatus.status = Status.InPickingUp;
    newOrderStatus.location = location;

    await this.orderStatusRepository.save(newOrderStatus);

    this.orderGateway.broadcastEvent('refresh');
    this.orderGateway.broadcastEvent('new_event_rider');
  }
}
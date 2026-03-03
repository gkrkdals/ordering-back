import { Injectable } from "@nestjs/common";
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

@Injectable()
export class DishDisposalService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

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
}
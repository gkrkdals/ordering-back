import { Injectable } from "@nestjs/common";
import { Customer } from "@src/entities/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { DishDisposalsResponseDto } from "@src/modules/main/client/order/dto/response/dish-disposals-response.dto";
import { Status } from "@src/types/enum/Status";

@Injectable()
export class DishDisposalService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,
  ) {
  }

  async getDishDisposals(customer: Customer): Promise<DishDisposalsResponseDto[]> {
    const doneDelivering = await this.orderStatusRepository.findBy({
      orderJoin: {
        customer: customer.id,
      },
      status: Status.AwaitingPickup,
    });

    const dishDisposals: DishDisposalsResponseDto[] = []

    doneDelivering.forEach((menu) => {
      dishDisposals.push({
        menu: menu.orderJoin.menuJoin.id,
        menuName: menu.orderJoin.menuJoin.name,
        disposalRequested: false,
        location: customer.memo
      });
    });

    return dishDisposals;
  }
}
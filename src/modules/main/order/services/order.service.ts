import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { Repository } from "typeorm";
import { OrderedMenuDto } from "@src/modules/main/order/dto/ordered-menu.dto";
import { Order } from "@src/entities/order.entity";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>
  ) {}

  getOrderCategories(): Promise<OrderCategory[]> {
    return this.orderCategoryRepository.find();
  }

  addOrder(orderedMenu: OrderedMenuDto[]) {
    for(const menu of orderedMenu) {
      this.orderRepository.create({
        
      });
    }
  }
}
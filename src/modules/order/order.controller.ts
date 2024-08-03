import { Body, Controller, Get, Post } from "@nestjs/common";
import { OrderService } from "@src/modules/order/services/order.service";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderedMenuDto } from "@src/modules/order/dto/ordered-menu.dto";

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('category')
  getCategories(): Promise<OrderCategory[]> {
    return this.orderService.getOrderCategories();
  }

  @Post()
  addOrder(@Body() orderedMenu: OrderedMenuDto[]) {
    return this.orderService.addOrder(orderedMenu);
  }
}
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { OrderService } from "@src/modules/main/manager/order/order.service";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";

@Controller('manager/order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  @Get()
  async getOrderStatus(@Query('page') page: number): Promise<GetOrderResponseDto> {
    return this.orderService.getOrders(page);
  }

  @Post()
  async createNewOrder(
    @Body('menu') menu: Menu[],
    @Body('customer') customer: Customer
  ) {
    return this.orderService.createNewOrder(menu, customer);
  }
}
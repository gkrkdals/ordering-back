import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { OrderService } from "@src/modules/main/manager/order/order.service";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";

@Controller('manager/order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  @Get('category')
  async getOrderCategories() {
    return this.orderService.getOrderCategories();
  }

  @Get()
  async getOrderStatus(
    @Query('page') page: number,
    @Query('query') query: string | undefined
  ): Promise<GetOrderResponseDto> {
    return this.orderService.getOrders(page, query);
  }

  @Post()
  async createNewOrder(
    @Body('menu') menu: Menu,
    @Body('customer') customer: Customer
  ) {
    return this.orderService.createNewOrder(menu, customer);
  }

  @Put()
  async updateOrder(@Body() body: UpdateOrderDto) {
    return this.orderService.updateOrder(body);
  }

  @Delete(':id')
  async cancelOrder(@Param('id') id: number) {
    return this.orderService.cancelOrder(id);
  }
}
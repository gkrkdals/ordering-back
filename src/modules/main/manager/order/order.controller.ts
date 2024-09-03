import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { OrderService } from "@src/modules/main/manager/order/order.service";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";
import { UserType } from "@src/types/UserType";

@Controller('manager/order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  @Get('pending')
  async pendingStatusForManager(@Query('user') user: UserType) {
    return this.orderService.pendingStatusForManager(user);
  }

  @Get('category')
  async getOrderCategories() {
    return this.orderService.getOrderCategories();
  }

  @Get()
  async getOrderStatus(
    @Query('page') page: number,
    @Query('query') query: string | undefined,
    @Query('user') user: UserType,
  ): Promise<GetOrderResponseDto> {
    return this.orderService.getOrders(page, query, user);
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
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { OrderService } from "@src/modules/main/manager/order/services/order.service";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { Menu } from "@src/entities/menu.entity";
import { Customer } from "@src/entities/customer.entity";
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";
import { UserType } from "@src/types/UserType";
import { UpdateOrderMenuDto } from "@src/modules/main/manager/order/dto/update-order-menu.dto";
import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { UserData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";

@Controller('manager/order')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderModifyService: OrderModifyService,
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

  @Get('history')
  async getOrderHistory(@Query('orderCode') orderCode: number) {
    return this.orderService.getOrderHistory(orderCode);
  }

  @Post()
  async createNewOrder(
    @Body('menu') menu: Menu,
    @Body('customer') customer: Customer,
    @Body('request') request: string,
  ) {
    return this.orderService.createNewOrder(menu, customer, request);
  }

  @Put()
  async updateOrder(@Body() body: UpdateOrderDto) {
    return this.orderModifyService.updateOrder(body);
  }

  @Delete(':id')
  async cancelOrder(@Param('id') id: number) {
    return this.orderModifyService.cancelOrder(id);
  }

  @Put('menu')
  async updateOrderMenu(@UserData() user: User, @Body() body: UpdateOrderMenuDto) {
    return this.orderModifyService.updateOrderMenu(body, user);
  }
}
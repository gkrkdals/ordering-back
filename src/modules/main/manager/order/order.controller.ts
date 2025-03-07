import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { OrderService } from "@src/modules/main/manager/order/services/order.service";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { Menu } from "@src/entities/menu/menu.entity";
import { UpdateOrderDto } from "@src/modules/main/manager/order/dto/update-order.dto";
import { UpdateOrderMenuDto } from "@src/modules/main/manager/order/dto/update-order-menu.dto";
import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { UserData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";
import { OrderStatusRaw } from "@src/types/models/OrderStatusRaw";
import { Request } from "express";
import { JwtUser } from "@src/types/jwt/JwtUser";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";

@Controller('manager/order')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderModifyService: OrderModifyService,
  ) {}

  @Get('pending')
  async pendingStatusForManager() {
    return this.orderService.pendingStatusForManager();
  }

  @Get('alarm')
  async stopAlarmIfNoPending() {
    return this.orderService.stopAlarmIfNoPending();
  }

  @Get('category')
  async getOrderCategories() {
    return this.orderService.getOrderCategories();
  }

  @Get(['', 'remaining'])
  async getOrderStatus(
    @Req() req: Request,
    @Query('column') column: keyof OrderStatusRaw,
    @Query('order') order: '' | 'asc' | 'desc',
    @Query('page') page: number,
    @Query('query') query: string | undefined,
    @UserData() user: User
  ): Promise<GetOrderResponseDto> {
    const isRemaining = req.originalUrl.includes('remaining');
    return this.orderService.getOrders(column, order, page, query, user, isRemaining);
  }

  @Get('sales')
  async getSales(@Query('date') date: string | undefined) {
    return this.orderService.getSales(date);
  }

  @Get('history')
  async getOrderHistory(@Query('orderCode') orderCode: number) {
    return this.orderService.getOrderHistory(orderCode);
  }

  @Post()
  async createNewOrder(
    @Body('menu') menu: Menu,
    @Body('customer') customer: JwtCustomer,
    @Body('request') request: string,
    @UserData() user: User
  ) {
    return this.orderService.createNewOrder(menu, customer, request, user);
  }

  @Put()
  async updateOrder(@UserData() user: JwtUser, @Body() body: UpdateOrderDto) {
    return this.orderModifyService.updateOrder(user, body);
  }

  @Put('menu')
  async updateOrderMenu(@UserData() user: User, @Body() body: UpdateOrderMenuDto) {
    return this.orderModifyService.updateOrderMenu(body, user);
  }

  @Put('rollback')
  async rollback(
    @Body('orderCode') orderCode: number,
    @Body('oldStatus') oldStatus: number,
    @Body('newStatus') newStatus: number
  ) {
    return this.orderModifyService.rollback(orderCode, oldStatus, newStatus);
  }

  @Delete(':id')
  async cancelOrder(@UserData() user: JwtUser, @Param('id') id: number) {
    return this.orderModifyService.cancelOrder(user, id);
  }
}
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { OrderService } from "@src/modules/main/client/order/services/order.service";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderedMenuDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { CustomerData } from "@src/modules/user/customer.decorator";
import { Customer } from "@src/entities/customer.entity";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { DishDisposalService } from "@src/modules/main/client/order/services/dish-disposal.service";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { CreateDishDisposalDto } from "@src/modules/main/client/order/dto/create-dish-disposal.dto";
import { Disposal } from "@src/types/models/Disposal";

@UseGuards(AuthGuard)
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly dishDisposalService: DishDisposalService,
  ) {}

  @Get('category')
  getCategories(): Promise<OrderCategory[]> {
    return this.orderService.getOrderCategories();
  }

  @Get('recent-request')
  getRecentRequests(@CustomerData() customer: Customer) {
    return this.orderService.getRecentRequests(customer);
  }

  @Get('credit')
  getCredit(@CustomerData() customer: Customer) {
    return this.orderService.getCredit(customer);
  }

  @Get('summary/count')
  getSummaryCount() {
    return this.orderService.getSummaryCount();
  }

  @Get('summary')
  getOrderSummaries(@CustomerData() customer: Customer): Promise<OrderSummaryResponseDto[]> {
    return this.orderService.getOrderSummaries(customer);
  }

  @Post()
  async addOrder(@CustomerData() customer: Customer, @Body() orderedMenu: OrderedMenuDto[]): Promise<void> {
    return this.orderService.addOrder(customer, orderedMenu);
  }

  @Get('dish')
  async getDishDisposals(@CustomerData() customer: Customer): Promise<Disposal[]> {
    return this.dishDisposalService.getDishDisposals(customer);
  }

  @Post('dish')
  async createDishDisposals(@Body() body: CreateDishDisposalDto) {
    return this.dishDisposalService.createDishDisposal(body);
  }
}

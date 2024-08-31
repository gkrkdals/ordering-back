import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { OrderService } from "@src/modules/main/client/order/services/order.service";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderedMenuDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { User } from "@src/modules/user/user.decorator";
import { Customer } from "@src/entities/customer.entity";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { DishDisposalService } from "@src/modules/main/client/order/services/dish-disposal.service";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { CreateDishDisposalDto } from "@src/modules/main/client/order/dto/create-dish-disposal.dto";
import { Disposal } from "@src/types/models/disposal";

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

  @Get('summary')
  getOrderSummaries(@User() customer: Customer): Promise<OrderSummaryResponseDto[]> {
    return this.orderService.getOrderSummaries(customer);
  }

  @Post()
  async addOrder(@User() customer: Customer, @Body() orderedMenu: OrderedMenuDto[]): Promise<void> {
    return this.orderService.addOrder(customer, orderedMenu);
  }

  @Get('dish')
  async getDishDisposals(@User() customer: Customer): Promise<Disposal[]> {
    return this.dishDisposalService.getDishDisposals(customer);
  }

  @Post('dish')
  async createDishDisposals(@Body() body: CreateDishDisposalDto) {
    return this.dishDisposalService.createDishDisposal(body);
  }
}

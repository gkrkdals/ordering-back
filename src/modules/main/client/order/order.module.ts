import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/client/order/order.controller";
import { OrderService } from "@src/modules/main/client/order/services/order.service";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { JwtService } from "@nestjs/jwt";
import { DishDisposalService } from "@src/modules/main/client/order/services/dish-disposal.service";
import { OrderGateway } from "@src/websocket/order.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    DishDisposalService,
    JwtService,
    OrderGateway,
  ],
})
export class OrderModule {}
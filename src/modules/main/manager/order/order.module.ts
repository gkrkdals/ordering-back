import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/manager/order/order.controller";
import { OrderService } from "@src/modules/main/manager/order/order.service";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { OrderGateway } from "@src/websocket/order.gateway";
import { CustomerPrice } from "@src/entities/customer-price";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
      CustomerCredit,
      CustomerPrice,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderGateway],
})
export class OrderModule {}
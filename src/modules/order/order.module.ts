import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/order/order.controller";
import { OrderService } from "@src/modules/order/services/order.service";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
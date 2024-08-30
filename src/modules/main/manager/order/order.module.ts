import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/manager/order/order.controller";
import { OrderService } from "@src/modules/main/manager/order/order.service";
import { CustomerCredit } from "@src/entities/customer-credit.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
      CustomerCredit
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
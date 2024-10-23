import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/manager/order/order.controller";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { OrderGateway } from "@src/socket/order.gateway";
import { CustomerPrice } from "@src/entities/customer-price";
import { OrderChange } from "@src/entities/order-change.entity";
import { OrderService } from "@src/modules/main/manager/order/services/order.service";
import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { JwtService } from "@nestjs/jwt";
import { Settings } from "@src/entities/settings.entity";
import { SchedulingOrderService } from "@src/modules/main/manager/order/services/scheduling-order.service";
import { FirebaseService } from "@src/firebase/firebase.service";
import { User } from "@src/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
      CustomerCredit,
      CustomerPrice,
      OrderChange,
      Settings,
      User,
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderModifyService,
    SchedulingOrderService,
    OrderGateway,
    JwtService,
    FirebaseService
  ],
})
export class OrderModule {}
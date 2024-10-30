import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/manager/order/order.controller";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { OrderChange } from "@src/entities/order-change.entity";
import { OrderService } from "@src/modules/main/manager/order/services/order.service";
import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { JwtService } from "@nestjs/jwt";
import { Settings } from "@src/entities/settings.entity";
import { SchedulingOrderService } from "@src/modules/main/manager/order/services/scheduling-order.service";
import { User } from "@src/entities/user.entity";
import { SocketModule } from "@src/modules/socket/socket.module";
import { FirebaseModule } from "@src/modules/firebase/firebase.module";
import { Customer } from "@src/entities/customer.entity";
import { Menu } from "@src/entities/menu.entity";

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
      Customer,
      Menu
    ]),
    SocketModule,
    FirebaseModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderModifyService,
    SchedulingOrderService,
    JwtService,
  ],
})
export class OrderModule {}
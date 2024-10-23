import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order-category.entity";
import { OrderController } from "@src/modules/main/client/order/order.controller";
import { OrderService } from "@src/modules/main/client/order/services/order.service";
import { Order } from "@src/entities/order.entity";
import { OrderStatus } from "@src/entities/order-status.entity";
import { JwtService } from "@nestjs/jwt";
import { DishDisposalService } from "@src/modules/main/client/order/services/dish-disposal.service";
import { OrderGateway } from "@src/socket/order.gateway";
import { CustomerPrice } from "@src/entities/customer-price";
import { CustomerCredit } from "@src/entities/customer-credit.entity";
import { Menu } from "@src/entities/menu.entity";
import { FirebaseService } from "@src/firebase/firebase.service";
import { User } from "@src/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatus,
      OrderCategory,
      CustomerPrice,
      CustomerCredit,
      User,
      Menu,
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    DishDisposalService,
    JwtService,
    OrderGateway,
    FirebaseService
  ],
})
export class OrderModule {}
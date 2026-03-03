import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer/customer-price.entity";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { JwtService } from "@nestjs/jwt";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { PointHistory } from "@src/entities/point-history.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerCategory,
      CustomerPrice,
      CustomerCredit,
      MenuCategory,
      DiscountGroup,
      PointHistory,
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CreditService, JwtService],
})
export class CustomerModule {}
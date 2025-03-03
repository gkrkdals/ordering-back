import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerCategory,
      CustomerPrice,
      CustomerCredit,
      MenuCategory,
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CreditService, JwtService],
})
export class CustomerModule {}
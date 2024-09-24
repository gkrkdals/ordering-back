import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";
import { CustomerCategory } from "@src/entities/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { MenuCategory } from "@src/entities/menu-category.entity";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { CustomerCredit } from "@src/entities/customer-credit.entity";

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
  providers: [CustomerService, CreditService],
  controllers: [CustomerController],
})
export class CustomerModule {}
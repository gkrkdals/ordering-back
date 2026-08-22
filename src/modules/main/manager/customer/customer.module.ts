import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { JwtService } from "@nestjs/jwt";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { GroupPrice } from "@src/entities/customer/group-price.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { CustomerSettingsModule } from "@src/modules/misc/customer-settings/customer-settings.module";

@Module({
  imports: [
    CustomerSettingsModule,
    TypeOrmModule.forFeature([
      Customer,
      CustomerCategory,
      CustomerCredit,
      MenuCategory,
      DiscountGroup,
      GroupPrice,
      PointHistory,
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CreditService, JwtService],
})
export class CustomerModule {}
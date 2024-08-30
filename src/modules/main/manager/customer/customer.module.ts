import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";
import { CustomerCategory } from "@src/entities/customer-category.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerCategory,
    ]),
  ],
  providers: [CustomerService],
  controllers: [CustomerController],
})
export class CustomerModule {}
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { CustomerService } from "@src/modules/main/manager/customer/customer.service";
import { CustomerController } from "@src/modules/main/manager/customer/customer.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
  ],
  providers: [CustomerService],
  controllers: [CustomerController],
})
export class CustomerModule {}
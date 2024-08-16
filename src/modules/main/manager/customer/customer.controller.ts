import { Controller, Get } from "@nestjs/common";
import { CustomerService } from "@src/modules/main/manager/customer/customer.service";
import { Customer } from "@src/entities/customer.entity";

@Controller('manager/customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async getAll(): Promise<Customer[]> {
    return this.customerService.getAll();
  }
}
import { Body, Controller, Delete, Get, Post, Put, Query } from "@nestjs/common";
import { CustomerService } from "@src/modules/main/manager/customer/customer.service";
import { Customer } from "@src/entities/customer.entity";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";

@Controller('manager/customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async getCustomer(
    @Query('page') page: number | undefined,
    @Query('query') query: string | undefined,
  ): Promise<Customer[] | GetCustomerResponseDto> {
    return this.customerService.getCustomer(page, query);
  }

  @Get('all')
  async getAll() {
    return this.customerService.getAll();
  }

  @Post()
  async createCustomer(@Body() body: Customer) {
    return this.customerService.createCustomer(body);
  }

  @Put()
  async updateCustomer(@Body() body: Customer): Promise<void> {
    return this.customerService.updateCustomer(body);
  }

  @Delete()
  async deleteCustomer(@Query('id') id: number) {
    return this.customerService.deleteCustomer(id);
  }
}
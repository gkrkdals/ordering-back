import { Body, Controller, Delete, Get, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { Customer } from "@src/entities/customer.entity";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { UpdateCustomerPriceDto } from "@src/modules/main/manager/customer/dto/update-customer-price.dto";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller('manager/customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly creditService: CreditService,
  ) {}

  @Get()
  async getCustomer(
    @Query('column') column: keyof Customer,
    @Query('order') order: '' | 'asc' | 'desc',
    @Query('page') page: number | undefined,
    @Query('query') query: string | undefined,
  ): Promise<GetCustomerResponseDto> {
    return this.customerService.getCustomer(column, order, page, query);
  }

  @Get('all')
  async getAll() {
    return this.customerService.getAll();
  }

  @Get('category')
  async getCategories() {
    return this.customerService.getCategories();
  }

  @Post()
  async createCustomer(@Body() body: Customer) {
    return this.customerService.createCustomer(body);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('excel'))
  async createCustomerFromExcel(@UploadedFile() excel: Express.Multer.File) {
    return this.customerService.createCustomerFromExcel(excel);
  }

  @Put()
  async updateCustomer(@Body() body: Customer): Promise<void> {
    return this.customerService.updateCustomer(body);
  }

  @Delete()
  async deleteCustomer(@Query('id') id: number) {
    return this.customerService.deleteCustomer(id);
  }

  @Get('price')
  async getCustomerPrice(@Query('id') id: number) {
    return this.customerService.getCustomerPrice(id);
  }

  @Put('price')
  async updateCustomerPrice(@Body() body: UpdateCustomerPriceDto) {
    return this.customerService.updateCustomerPrice(body);
  }

  @Post('credit')
  async addCustomerCredit(
    @Body('mode') mode: number,
    @Body('customer') customer: number,
    @Body('price') price: number,
  ) {
    return this.creditService.addCredit(mode, customer, price);
  }
}
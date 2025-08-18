import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { Customer } from "@src/entities/customer/customer.entity";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { UpdateCustomerPriceDto } from "@src/modules/main/manager/customer/dto/update-customer-price.dto";
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { UserData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";

@Controller('manager/customer')
@UseGuards(AuthGuard)
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
    @UserData() user: User,
  ) {
    return this.creditService.addCredit(mode, customer, price, user);
  }

  @Get('discount-group')
  async getDiscountGroups() {
    return this.customerService.getDiscountGroups();
  }

  @Put('discount-group')
  async modifyDiscountGroups(@Body('modified') modified: DiscountGroup[], @Body('added') added: DiscountGroup[]) {
    await this.customerService.modifyDiscountGroups(modified, added);
  }

  @Put('discount-group/all')
  async setAllGroup(@Body('groupId') groupId: number) {
    await this.customerService.setAllGroup(groupId);
  }
}
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
import { CreditService } from "@src/modules/main/manager/customer/services/credit.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { RolesGuard } from "@src/modules/auth/roles.guard";
import { Roles } from "@src/decorators/roles.decorator";
import { UserData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { UpdateGroupPriceDto } from "@src/modules/main/manager/customer/dto/update-group-price.dto";

@Controller('manager/customer')
@UseGuards(AuthGuard, RolesGuard)
@Roles(['manager', 'rider', 'cook'])
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
  @Roles(['manager'])
  async updateCustomer(@Body() body: Customer): Promise<void> {
    return this.customerService.updateCustomer(body);
  }

  @Delete()
  @Roles(['manager'])
  async deleteCustomer(@Query('id') id: number) {
    return this.customerService.deleteCustomer(id);
  }

  @Post('credit')
  @Roles(['manager'])
  async addCustomerCredit(
    @Body('mode') mode: number,
    @Body('customer') customer: number,
    @Body('price') price: number,
    @Body('memo') memo: string,
    @UserData() user: User,
  ) {
    return this.creditService.addCredit(mode, customer, price, user, memo);
  }

  // 그룹별 메뉴카테고리 가격 (고객별 price 엔드포인트와 같은 규약, 단위는 천원)
  @Get('group/price')
  async getGroupPrice(@Query('groupId') groupId: number) {
    return this.customerService.getGroupPrice(groupId);
  }

  @Put('group/price')
  async updateGroupPrice(@Body() body: UpdateGroupPriceDto) {
    return this.customerService.updateGroupPrice(body);
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

  @Get('point-history')
  async getPointHistory(@Query('id') id: number) {
    return this.customerService.getPointHistory(id);
  }

  @Post('point')
  @Roles(['manager'])
  async adjustCustomerPoint(
    @Body('customer') customer: number,
    @Body('mode') mode: number,
    @Body('amount') amount: number,
    @Body('memo') memo: string,
  ) {
    return this.customerService.adjustPoint(customer, mode, amount, memo);
  }
}
import { Body, Controller, Get, Put, Query, Res, UseGuards } from "@nestjs/common";
import { SettingsService } from "@src/modules/main/client/settings/settings.service";
import { Response } from "express";
import { AuthGuard } from "@src/modules/auth/auth.guard";

@UseGuards(AuthGuard)
@Controller('settings')
export class SettingsController {

  constructor(private readonly settingsService: SettingsService) {}

  @Get('logo')
  async getLogo(@Res({ passthrough: true }) res: Response) {
    return this.settingsService.getLogo(res);
  }

  @Get('standard')
  async getStandardSettings() {
    return this.settingsService.getStandardSettings();
  }

  @Put('show-price')
  async updateShowPrice(
    @Body('customerId') customerId: number,
    @Body('value') value: 0 | 1
  ) {
    return this.settingsService.updateShowPrice(customerId, value);
  }

  @Put('hide-order-status')
  async updateHideOrderStatus(
    @Body('customerId') customerId: number,
    @Body('value') value: 0 | 1
  ) {
    return this.settingsService.updateHideOrderStatus(customerId, value);
  }

  @Put('show-confirm')
  async updateShowConfirm(
    @Body('customerId') customerId: number,
    @Body('value') value: 0 | 1
  ) {
    return this.settingsService.updateShowConfirm(customerId, value);
  }

  @Get('history')
  async getHistory(
    @Query('customerId') customerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      orders: await this.settingsService.getOrderHistory(customerId, startDate, endDate),
      credit: await this.settingsService.getCreditHistory(customerId, startDate, endDate),
    }
  }
}
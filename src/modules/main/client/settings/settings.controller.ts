import { Body, Controller, Get, Put, Res } from "@nestjs/common";
import { SettingsService } from "@src/modules/main/client/settings/settings.service";
import { Response } from "express";

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
}
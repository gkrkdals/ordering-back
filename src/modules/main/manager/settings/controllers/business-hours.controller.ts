import { Body, Controller, Get, Put } from "@nestjs/common";
import { BusinessHoursService } from "@src/modules/main/manager/settings/services/business-hours.service";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";

@Controller('manager/settings')
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {
  }

  @Get('hour')
  async getHours() {
    return this.businessHoursService.getHours();
  }

  @Put('hour')
  async updateHours(@Body() hours: UpdateHoursDto[]) {
    return this.businessHoursService.updateHours(hours);
  }
}
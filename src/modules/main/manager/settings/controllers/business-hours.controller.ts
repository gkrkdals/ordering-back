import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { BusinessHoursService } from "@src/modules/main/manager/settings/services/business-hours.service";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { RolesGuard } from "@src/modules/auth/roles.guard";
import { Roles } from "@src/decorators/roles.decorator";

@Controller('manager/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(['manager', 'rider', 'cook'])
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
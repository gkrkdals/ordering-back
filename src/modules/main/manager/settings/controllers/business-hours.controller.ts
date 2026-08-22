import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { BusinessHoursService } from "@src/modules/main/manager/settings/services/business-hours.service";
import { UpdateHoursDto } from "@src/modules/main/manager/settings/dto/update-hours.dto";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { RolesGuard } from "@src/modules/auth/roles.guard";
import { Roles } from "@src/decorators/roles.decorator";
import { GLOBAL_GROUP_ID } from "@src/entities/settings.entity";

@Controller('manager/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(['manager', 'rider', 'cook'])
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {
  }

  // groupId 를 생략하면 전역(전체 공통) 영업시간을 다룬다
  @Get('hour')
  async getHours(@Query('groupId') groupId?: number) {
    return this.businessHoursService.getHours(toGroupId(groupId));
  }

  @Put('hour')
  async updateHours(
    @Body('hours') hours: UpdateHoursDto[],
    @Body('groupId') groupId?: number,
  ) {
    return this.businessHoursService.updateHours(hours, toGroupId(groupId));
  }
}

/** 쿼리·바디로 넘어온 groupId 를 숫자로 정규화한다. 없거나 -1 이면 전역(0) */
function toGroupId(groupId: number | string | undefined): number {
  const parsed = Number(groupId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : GLOBAL_GROUP_ID;
}

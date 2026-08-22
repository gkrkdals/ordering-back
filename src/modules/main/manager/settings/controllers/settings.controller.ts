import {
  Body,
  Controller, Delete,
  Get,
  Header, Param, ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { SettingsService } from "@src/modules/main/manager/settings/services/settings.service";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { Settings } from "@src/entities/settings.entity";
import { diskStorage } from "multer";
import * as Path from "path";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { RolesGuard } from "@src/modules/auth/roles.guard";
import { Roles } from "@src/decorators/roles.decorator";
import { NoAlarmsService } from "@src/modules/main/manager/settings/services/no-alarms.service";
import { CalculationService } from "@src/modules/main/manager/settings/services/calculation.service";
import { UpdateDisposalTimeDto } from "@src/modules/main/manager/settings/dto/update-disposal-time.dto";
import { GLOBAL_GROUP_ID } from "@src/entities/settings.entity";

@Controller('manager/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(['manager', 'rider', 'cook'])
export class SettingsController {
  constructor(
    private readonly settingService: SettingsService,
    private readonly noAlarmsService: NoAlarmsService,
    private readonly calculationService: CalculationService,
  ) {}

  @Get('exceed')
  async getExceedSettings() {
    return this.settingService.getExceedSettings();
  }

  @Put('exceed')
  async updateExceedSettings(@Body('1') cookExceed: number, @Body('2') deliverDelay: number) {
    return this.settingService.updateExceedSettings(cookExceed, deliverDelay)
  }

  @Get('standard')
  async getStandardInfo() {
    return this.settingService.getStandardInfo();
  }

  @Put('standard')
  async updateStandardInfo(@Body() settings: Settings[]) {
    return this.settingService.updateStandardInfo(settings);
  }

  @Get('calculation')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename=calculation.xlsx')
  async getCalculation(@Query() dto: GetCalculationDto, @Res() res: Response) {
    await this.calculationService.getCalculation(dto, res);
  }

  @Get('logo')
  async getLogo(@Res({ passthrough: true }) res: Response) {
    return this.settingService.getLogo(res);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: Path.join(__dirname, '../../../../../logo'),
      filename(_, file, callback): void {
        return callback(null, `logo.${file.originalname.split('.')[1]}`)
      }
    })
  }))
  async updateLogo(@UploadedFile() file: Express.Multer.File) {
    return this.settingService.updateLogo(`logo.${file.originalname.split('.')[1]}`)
  }

  @Get('no-alarm')
  async getNoAlarms() {
    return this.noAlarmsService.getNoAlarms();
  }

  @Put('no-alarm')
  async updateNoAlarms(@Body('menu') menu: number) {
    await this.noAlarmsService.updateNoAlarms(menu);
  }

  @Delete('no-alarm/:id')
  async deleteNoAlarm(@Param('id', ParseIntPipe) menu: number) {
    await this.noAlarmsService.deleteNoAlarms(menu);
  }

  @Get('menu/category')
  async getMenuCategories() {
    return this.settingService.getMenuCategories();
  }

  @Put('menu/category')
  async modifyMenuCategories(@Body('modified') modified: any[], @Body('added') added: any[]) {
    await this.settingService.modifyMenuCategories(modified, added);
  }

  // groupId 를 생략하면 전역(전체 공통) 설정을 다룬다
  @Get('discount')
  async getDiscountValue(@Query('groupId') groupId?: number) {
    return this.settingService.getDiscountValue(toGroupId(groupId));
  }

  @Put('discount')
  async updateDiscount(@Body('value') value: number, @Body('groupId') groupId?: number) {
    await this.settingService.updateDiscount(value, toGroupId(groupId));
  }

  // 고객 앱은 그룹이 반영된 GET /api/order/dish/disposal-time 을 쓴다
  @Get('disposal-time')
  async getDisposalTimes(@Query('groupId') groupId?: number) {
    return this.settingService.getDisposalTimes(toGroupId(groupId));
  }

  @Put('disposal-time')
  async updateDisposalTimes(
    @Body('days') days: UpdateDisposalTimeDto[],
    @Body('groupId') groupId?: number,
  ) {
    return this.settingService.updateDisposalTimes(days, toGroupId(groupId));
  }

  @Get('min-use-point')
  async getMinUsePoint(@Query('groupId') groupId?: number) {
    return this.settingService.getMinUsePoint(toGroupId(groupId));
  }

  @Put('min-use-point')
  async updateMinUsePoint(@Body('value') value: number, @Body('groupId') groupId?: number) {
    return this.settingService.updateMinUsePoint(value, toGroupId(groupId));
  }

  @Get('point-use-policy')
  async getPointUsePolicy(@Query('groupId') groupId?: number) {
    return this.settingService.getPointUsePolicy(toGroupId(groupId));
  }

  @Put('point-use-policy')
  async updatePointUsePolicy(
    @Body('minUsePoint') minUsePoint: number,
    @Body('groupId') groupId?: number,
  ) {
    return this.settingService.updatePointUsePolicy(minUsePoint, toGroupId(groupId));
  }
}

/** 쿼리·바디로 넘어온 groupId 를 숫자로 정규화한다. 없거나 -1 이면 전역(0) */
function toGroupId(groupId: number | string | undefined): number {
  const parsed = Number(groupId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : GLOBAL_GROUP_ID;
}

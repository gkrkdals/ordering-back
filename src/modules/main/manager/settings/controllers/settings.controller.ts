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
import { NoAlarmsService } from "@src/modules/main/manager/settings/services/no-alarms.service";
import { CalculationService } from "@src/modules/main/manager/settings/services/calculation.service";

@Controller('manager/settings')
@UseGuards(AuthGuard)
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

  @Get('discount')
  async getDiscountValue() {
    return this.settingService.getDiscountValue();
  }

  @Put('discount')
  async updateDiscount(@Body('value') value: number) {
    await this.settingService.updateDiscount(value);
  }
}
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
import { SettingsService } from "@src/modules/main/manager/settings/settings.service";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import * as XLSX from "xlsx-js-style";
import { Response } from "express";
import * as fs from "node:fs";
import { FileInterceptor } from "@nestjs/platform-express";
import { Settings } from "@src/entities/settings.entity";
import { diskStorage } from "multer";
import * as Path from "path";
import { header } from "@src/config/xlsx";
import { AuthGuard } from "@src/modules/auth/auth.guard";
import { NoAlarmsService } from "@src/modules/main/manager/settings/services/no-alarms.service";

@Controller('manager/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(
    private readonly settingService: SettingsService,
    private readonly noAlarmsService: NoAlarmsService
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
    const data = await this.settingService.getCalculation(dto);
    const wb = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    newWorksheet['!cols'] = this.fitToColumn([header, ...data])

    XLSX.utils.book_append_sheet(wb, newWorksheet, 'calculation');

    const filename = 'calculation.xlsx';
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });

    const stream = fs.createReadStream(filename);
    stream.pipe(res);
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

  private fitToColumn(arrayOfArray: any[][]) {
    // get maximum character of each column
    return arrayOfArray[0].map((a, i) => ({ wch: Math.max(...arrayOfArray.map(a2 => a2[i] ? a2[i].toString().length : 0)) * 1.2 }));
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
}
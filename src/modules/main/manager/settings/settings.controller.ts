import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import { SettingsService } from "@src/modules/main/manager/settings/settings.service";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import * as XLSX from "xlsx";
import { Response } from "express";
import * as fs from "node:fs";

@Controller('manager/settings')
export class SettingsController {
  constructor(private readonly settingService: SettingsService) {}

  @Get('calculation')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename=calculation.xlsx')
  async getCalculation(@Query() dto: GetCalculationDto, @Res() res: Response) {
    const { data, title } = await this.settingService.getCalculation(dto);
    const wb = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, newWorksheet, title);

    const filename = 'calculation.xlsx';
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });

    const stream = fs.createReadStream(filename);
    stream.pipe(res);
  }
}
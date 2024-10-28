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
import { MenuService } from "@src/modules/main/manager/menu/menu.service";
import { Menu } from "@src/entities/menu.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@src/modules/auth/auth.guard";

@Controller('manager/menu')
@UseGuards(AuthGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenus(
    @Query('column') column: keyof Menu,
    @Query('order') order: '' | 'asc' | 'desc',
    @Query('page') page: number,
    @Query('query') query: string | undefined
  ) {
    return this.menuService.getMenus(column, order, page, query);
  }

  @Get('all')
  async getAll() {
    return this.menuService.getAll();
  }

  @Get('category')
  async getMenuCategoryAll() {
    return this.menuService.getMenuCategoryAll();
  }

  @Post()
  async createMenu(@Body() body: Menu) {
    return this.menuService.createMenu(body);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('excel'))
  async createMenuFromExcel(@UploadedFile() excel: Express.Multer.File) {
    return this.menuService.createMenuFromExcel(excel);
  }

  @Put()
  async updateMenu(@Body() body: Menu) {
    return this.menuService.updateMenu(body);
  }

  @Put('sold-out')
  async toggleSoldOut(@Body('menu') menu: number, @Body('soldOut') soldOut: boolean) {
    return this.menuService.toggleSoldOut(menu, soldOut);
  }

  @Put('sold-out/all')
  async toggleSoldOutAll(@Body('soldOut') soldOut: boolean) {
    return this.menuService.toggleSoldOutAll(soldOut);
  }

  @Put('seq')
  async updateMenuSeq(@Body('seqArray') seqArray: { id: number, seq: number | null }[]) {
    return this.menuService.updateMenuSeq(seqArray);
  }

  @Delete()
  async deleteMenu(@Query('id') id: number) {
    return this.menuService.deleteMenu(id);
  }


}
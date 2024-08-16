import { Controller, Get, Query } from "@nestjs/common";
import { MenuService } from "@src/modules/main/manager/menu/menu.service";

@Controller('manager/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenus(@Query('page') page: number) {
    return this.menuService.getMenus(page);
  }

  @Get('all')
  async getAll() {
    return this.menuService.getAll();
  }
}
import { Body, Controller, Delete, Get, Post, Put, Query } from "@nestjs/common";
import { MenuService } from "@src/modules/main/manager/menu/menu.service";
import { Menu } from "@src/entities/menu.entity";

@Controller('manager/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenus(@Query('page') page: number, @Query('query') query: string | undefined) {
    return this.menuService.getMenus(page, query);
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
  async createFood(@Body() body: Menu) {
    return this.menuService.createFood(body);
  }

  @Put()
  async updateFood(@Body() body: Menu) {
    return this.menuService.updateFood(body);
  }

  @Delete()
  async deleteFood(@Query('id') id: number) {
    return this.menuService.deleteFood(id);
  }
}
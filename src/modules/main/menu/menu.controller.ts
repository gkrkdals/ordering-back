import { Controller, Get } from '@nestjs/common';
import { Menu } from "@src/entities/menu.entity";
import { MenuService } from "@src/modules/main/menu/menu.service";

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {
  }

  @Get()
  findAll(): Promise<Menu[]> {
    return this.menuService.findAll();
  }

}

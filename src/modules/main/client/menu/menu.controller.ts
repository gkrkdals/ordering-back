import { Controller, Get, UseGuards } from '@nestjs/common';
import { Menu } from "@src/entities/menu.entity";
import { AuthGuard } from '@src/modules/auth/auth.guard';
import { MenuService } from "@src/modules/main/client/menu/menu.service";

@UseGuards(AuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {
  }

  @Get()
  findAll(): Promise<Menu[]> {
    return this.menuService.findAll();
  }

}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { Menu } from "@src/entities/menu.entity";
import { AuthGuard } from '@src/modules/auth/auth.guard';
import { MenuService } from "@src/modules/main/client/menu/menu.service";
import { CustomerData } from "@src/modules/user/customer.decorator";
import { Customer } from "@src/entities/customer.entity";

@UseGuards(AuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {
  }

  @Get()
  async findAll(): Promise<Menu[]> {
    return this.menuService.findAll();
  }

  @Get('/recent')
  async findRecentMenus(@CustomerData() customer: Customer) {
    return this.menuService.findRecentMenus(customer);
  }

}

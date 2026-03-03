import { Menu } from "@src/entities/menu/menu.entity";

export class OrderedMenuDto {
  menu: Menu;
  request: string;
}

export class OrderMenuWithPointDto {
  orderedMenus: OrderedMenuDto[];
  point: number;
}
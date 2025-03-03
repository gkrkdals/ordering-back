import { Menu } from "@src/entities/menu/menu.entity";

export interface RecentMenu extends Menu {
  time: string;
}
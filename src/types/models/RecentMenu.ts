import { Menu } from "@src/entities/menu.entity";

export interface RecentMenu extends Menu {
  time: string;
}
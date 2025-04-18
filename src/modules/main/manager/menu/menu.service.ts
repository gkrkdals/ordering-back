import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu/menu.entity";
import { FindOptionsOrder, Like, MoreThan, Not, Repository } from "typeorm";
import { countToTotalPage } from "@src/utils/data";
import { GetMenuResponseDto } from "@src/modules/main/manager/menu/dto/response/get-menu-response.dto";
import { MenuCategory } from "@src/entities/menu/menu-category.entity";
import * as XLSX from 'xlsx-js-style';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(MenuCategory)
    private readonly foodCategoryRepository: Repository<MenuCategory>
  ) {}

  async getMenus(
    column: keyof Menu,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string | undefined
  ): Promise<GetMenuResponseDto> {
    const like = Like(`%${query}%`);
    const findOrder: FindOptionsOrder<Menu> = {}

    if (order !== '') {
      findOrder[column] = order;
    } else {
      findOrder.seq = 'asc';
      findOrder.id = 'asc';
    }

    const [data, count] = await this.menuRepository.findAndCount({
      relations: {
        menuCategory: true,
      },
      where: [
        { menuCategory: { name: like }, withdrawn: Not(1) },
        { name: like, withdrawn: Not(1) },
      ],
      order: findOrder
    });

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      data,
      count,
    }
  }

  async getAll(): Promise<Menu[]> {
    return this.menuRepository.find({
      relations: { menuCategory: true },
      where: { withdrawn: Not(1) },
      order: { seq: 'ASC' }
    });
  }

  async getMenuCategoryAll(): Promise<MenuCategory[]> {
    return this.foodCategoryRepository.find({
      where: { id: MoreThan(0) },
      order: { price: 'ASC' }
    });
  }

  async createMenu(body: Menu) {
    const newMenu = new Menu();
    newMenu.name = body.name;
    newMenu.category = body.category;
    await this.menuRepository.save(newMenu);
  }

  async createMenuFromExcel(excel: Express.Multer.File) {
    const workbook = XLSX.read(excel.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    for (const row of data) {
      const menuName = row['메뉴명'];
      const category = typeof row['카테고리'] === "string" ? parseInt(row['카테고리']) : row['카테고리'];

      if (menuName === undefined || menuName === null) {
        continue;
      }

      if (!isNaN(category)) {
        const newMenu = new Menu();
        newMenu.name = menuName;
        newMenu.category = category;

        await this.menuRepository.save(newMenu);
      }
    }
  }

  async updateMenu(menu: Menu): Promise<void> {
    const updatedMenu = await this.menuRepository.findOneBy({ id: menu.id });

    if (updatedMenu) {
      updatedMenu.category = menu.category;
      updatedMenu.name = menu.name;
      updatedMenu.soldOut = menu.soldOut;
      await this.menuRepository.save(updatedMenu);
    }
  }

  async toggleSoldOut(menu: number, soldOut: boolean) {
    await this.menuRepository.update({ id: menu }, { soldOut: !soldOut ? 1 : 0 });
  }

  async toggleSoldOutAll(soldOut: boolean) {
    await this.menuRepository.update({}, { soldOut: soldOut ? 1 : 0 });
  }

  async updateMenuSeq(seqArray: { id: number, seq: number | null }[]) {
    for (const element of seqArray) {
      const foundMenu = await this.menuRepository.findOneBy({ id: element.id });
      foundMenu.seq = element.seq;
      await this.menuRepository.save(foundMenu);
    }
  }

  async deleteMenu(id: number): Promise<void> {
    const foundMenu = await this.menuRepository.findOneBy({ id });
    foundMenu.withdrawn = 1;
    await this.menuRepository.save(foundMenu);
  }
}
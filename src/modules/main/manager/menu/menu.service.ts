import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { FindOptionsOrder, LessThan, Like, MoreThan, Not, Repository } from "typeorm";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { GetMenuResponseDto } from "@src/modules/main/manager/menu/dto/response/get-menu-response.dto";
import { MenuCategory } from "@src/entities/menu-category.entity";

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
    }

    const [data, count] = await this.menuRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
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
    return this.menuRepository.find({ relations: { menuCategory: true }, where: { withdrawn: Not(1) }});
  }

  async getMenuCategoryAll(): Promise<MenuCategory[]> {
    return this.foodCategoryRepository.findBy({ id: MoreThan(0) });
  }

  async createMenu(body: Menu) {
    const newMenu = new Menu();
    newMenu.name = body.name;
    newMenu.category = body.category;
    await this.menuRepository.save(newMenu);
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

  async deleteMenu(id: number): Promise<void> {
    const foundMenu = await this.menuRepository.findOneBy({ id });
    foundMenu.withdrawn = 1;
    await this.menuRepository.save(foundMenu);
  }
}
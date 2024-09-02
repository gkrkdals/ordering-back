import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { LessThan, Like, Not, Repository } from "typeorm";
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

  async getMenus(page: number, query: string | undefined): Promise<GetMenuResponseDto> {
    const like = Like(`%${query}%`);

    const [data, count] = await this.menuRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
      relations: {
        menuCategory: true,
      },
      where: [
        { menuCategory: { name: like } },
        { name: like },
      ] && { id: Not(0) },
    });

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      data,
    }
  }

  async getAll(): Promise<Menu[]> {
    return this.menuRepository.find({ relations: { menuCategory: true }});
  }

  async getMenuCategoryAll(): Promise<MenuCategory[]> {
    return this.foodCategoryRepository.find({ where: { id: LessThan(4) } });
  }

  async createFood(body: Menu) {
    const newMenu = new Menu();
    newMenu.name = body.name;
    newMenu.category = body.category;
    await this.menuRepository.save(newMenu);
  }

  async updateFood(menu: Menu): Promise<void> {
    const updatedMenu = await this.menuRepository.findOneBy({ id: menu.id });

    if (updatedMenu) {
      updatedMenu.category = menu.category;
      updatedMenu.name = menu.name;
      updatedMenu.soldOut = menu.soldOut;
      await this.menuRepository.save(updatedMenu);
    }
  }

  async deleteFood(id: number): Promise<void> {
    await this.menuRepository.delete(id);
  }
}
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { Like, Repository } from "typeorm";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { GetMenuResponseDto } from "@src/modules/main/manager/menu/dto/response/get-menu-response.dto";
import { FoodCategory } from "@src/entities/food-category.entity";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(FoodCategory)
    private readonly foodCategoryRepository: Repository<FoodCategory>
  ) {}

  async getMenus(page: number, query: string | undefined): Promise<GetMenuResponseDto> {
    const like = Like(`%${query}%`);

    const [data, count] = await this.menuRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
      relations: {
        foodCategory: true,
      },
      where: [
        { foodCategory: { name: like } },
        { name: like },
      ]
    });

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      data,
    }
  }

  async getAll(): Promise<Menu[]> {
    return this.menuRepository.find({ relations: { foodCategory: true }});
  }

  async getFoodCategoryAll(): Promise<FoodCategory[]> {
    return this.foodCategoryRepository.find();
  }

  async createFood(body: Menu) {
    const newMenu = new Menu();
    newMenu.name = body.name;
    newMenu.priceCategory = body.priceCategory;
    await this.menuRepository.save(newMenu);
  }

  async updateFood(menu: Menu): Promise<void> {
    const updatedMenu = await this.menuRepository.findOneBy({ id: menu.id });

    if (updatedMenu) {
      updatedMenu.priceCategory = menu.priceCategory;
      updatedMenu.name = menu.name;
      await this.menuRepository.save(updatedMenu);
    }
  }

  async deleteFood(id: number): Promise<void> {
    await this.menuRepository.delete(id);
  }
}
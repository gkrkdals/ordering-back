import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Menu } from "@src/entities/menu.entity";
import { Repository } from "typeorm";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { GetMenuResponseDto } from "@src/modules/main/manager/menu/dto/response/get-menu-response.dto";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu) private readonly menuRepository: Repository<Menu>,
  ) {}

  async getMenus(page: number): Promise<GetMenuResponseDto> {
    const [data, count] = await this.menuRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
      relations: {
        foodCategory: true,
      }
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
}
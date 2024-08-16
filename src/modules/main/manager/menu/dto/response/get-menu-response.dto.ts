import { BasicDto } from "@src/types/dto/basic.dto";
import { Menu } from "@src/entities/menu.entity";

export class GetMenuResponseDto extends BasicDto {
  data: Menu[];
}
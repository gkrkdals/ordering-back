import { BasicDto } from "@src/types/dto/basic.dto";
import { OrderStatusRaw } from "@src/types/models/OrderStatusRaw";

export class GetOrderResponseDto extends BasicDto {
  data: OrderStatusRaw[];
  limit: number;
  name: string;
}
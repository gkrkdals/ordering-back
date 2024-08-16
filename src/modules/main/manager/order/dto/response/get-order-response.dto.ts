import { BasicDto } from "@src/types/dto/basic.dto";
import { OrderStatus } from "@src/entities/order-status.entity";

export class GetOrderResponseDto extends BasicDto {
  data: OrderStatus[];
}
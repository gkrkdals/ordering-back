import { BasicDto } from "@src/types/dto/basic.dto";
import { Customer } from "@src/entities/customer.entity";

export class GetCustomerResponseDto extends BasicDto {
  data: Customer[];
}
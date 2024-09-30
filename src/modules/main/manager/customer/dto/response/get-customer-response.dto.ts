import { BasicDto } from "@src/types/dto/basic.dto";
import { CustomerRaw } from "@src/types/models/CustomerRaw";

export class GetCustomerResponseDto extends BasicDto {
  data: CustomerRaw[];
}
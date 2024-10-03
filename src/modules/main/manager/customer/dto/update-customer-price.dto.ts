interface PriceData {
  id: number;
  price: string;
}

export class UpdateCustomerPriceDto {
  [i: number]: string;
  customer: number;
  data: PriceData[]
}
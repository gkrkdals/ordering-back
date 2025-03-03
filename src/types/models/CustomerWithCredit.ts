import { Customer } from "@src/entities/customer/customer.entity";

export interface CustomerWithCredit extends Customer {
  credit: number;
}
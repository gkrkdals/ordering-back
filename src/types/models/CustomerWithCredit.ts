import { Customer } from "@src/entities/customer.entity";

export interface CustomerWithCredit extends Customer {
  credit: number;
}
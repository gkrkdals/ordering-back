import { CustomerRaw } from "@src/types/models/CustomerRaw";

export interface JwtCustomer extends CustomerRaw {
  token: string;
}
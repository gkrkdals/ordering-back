import { UserRaw } from "@src/types/models/UserRaw";

export interface JwtUser extends UserRaw {
  token: string;
}
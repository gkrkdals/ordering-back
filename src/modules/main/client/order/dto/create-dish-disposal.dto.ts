import { Disposal } from "@src/types/models/disposal";

export class CreateDishDisposalDto {
  disposal: Disposal;
  location: string;
}
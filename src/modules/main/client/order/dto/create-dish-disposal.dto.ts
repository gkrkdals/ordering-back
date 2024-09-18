import { Disposal } from "@src/types/models/Disposal";

export class CreateDishDisposalDto {
  disposal: Disposal;
  location: string;
}
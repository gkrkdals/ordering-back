import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'calculation_category' })
export class CalculationCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
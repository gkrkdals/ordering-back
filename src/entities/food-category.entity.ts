import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'food_category' })
export class FoodCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hex: string;

  @Column()
  price: number;

  @Column({ nullable: true })
  name: string;
}
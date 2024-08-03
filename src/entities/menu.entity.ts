import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { FoodCategory } from "./food-category.entity";

@Entity()
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @JoinColumn({ name: 'price_category' })
  @OneToOne(() => FoodCategory)
  foodCategory: FoodCategory;
}
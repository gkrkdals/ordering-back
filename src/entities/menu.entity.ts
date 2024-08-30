import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { MenuCategory } from "./menu-category.entity";

@Entity()
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  category: number;

  @Column()
  name: string;

  @JoinColumn({ name: 'category' })
  @OneToOne(() => MenuCategory)
  menuCategory: MenuCategory;
}
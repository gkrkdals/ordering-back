import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'menu_category' })
export class MenuCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hex: string;

  @Column()
  price: number;

  @Column({ nullable: true })
  name: string;
}
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('order_category')
export class OrderCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: number;

  @Column()
  name: string;
}
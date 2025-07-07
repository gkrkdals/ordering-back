import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('order_category')
export class OrderCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  hex: string | null;
}
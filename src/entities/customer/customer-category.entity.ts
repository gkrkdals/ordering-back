import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('customer_category')
export class CustomerCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  hex: string;
}
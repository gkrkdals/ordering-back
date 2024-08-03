import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Menu } from "@src/entities/menu.entity";

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @JoinColumn({ name: 'customer' })
  @OneToOne(() => Customer)
  customer: Customer;

  @JoinColumn({ name: 'menu' })
  @OneToOne(() => Menu)
  menu: Menu;

  @Column()
  time: Date;

  @Column()
  memo: string;
}
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { OrderStatus } from "@src/entities/order/order-status.entity";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer: number;

  @JoinColumn({ name: 'customer' })
  @OneToOne(() => Customer)
  customerJoin: Customer;

  @Column()
  menu: number;

  @Column({ nullable: true })
  path: number | null;

  @JoinColumn({ name: 'menu' })
  @OneToOne(() => Menu)
  menuJoin: Menu;

  @Column()
  time: string;

  @Column({ nullable: true })
  request: string;

  @Column({ nullable: true })
  memo: string;

  @Column()
  price: number;

  @OneToMany(() => OrderStatus, status => status.orderJoin)
  orderStatus: OrderStatus[];
}
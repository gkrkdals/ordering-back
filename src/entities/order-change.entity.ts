import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Menu } from "@src/entities/menu.entity";
import { Order } from "@src/entities/order.entity";

@Entity('order_change')
export class OrderChange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_code' })
  orderCode: number;

  @JoinColumn({ name: 'order_code' })
  @OneToOne(() => Order)
  orderJoin: Order;

  @Column()
  from: number;

  @JoinColumn({ name: 'from' })
  @OneToOne(() => Menu)
  fromJoin: Menu;

  @Column()
  to: number;

  @JoinColumn({ name: 'to' })
  @OneToOne(() => Menu)
  toJoin: Menu;

  @Column()
  time: string;
}
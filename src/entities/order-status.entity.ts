import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderCategory } from "@src/entities/order-category.entity";
import { User } from "@src/entities/user.entity";

@Entity('order_status')
export class OrderStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  by: number | null;

  @JoinColumn({ name: 'by' })
  @OneToOne(() => User, { nullable: true })
  byJoin: User | null;

  @Column({ name: 'order_code' })
  orderCode: number;

  @JoinColumn({ name: 'order_code' })
  @ManyToOne(() => Order, order => order.id)
  orderJoin: Order;

  @Column()
  status: number;

  @JoinColumn({ name: 'status' })
  @OneToOne(() => OrderCategory)
  statusJoin: OrderCategory;

  @Column()
  time: Date;

  @Column({ nullable: true })
  location: string;
}
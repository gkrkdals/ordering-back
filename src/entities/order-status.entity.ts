import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderCategory } from "@src/entities/order-category.entity";

@Entity('order_status')
export class OrderStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_code' })
  orderCode: number;

  @JoinColumn({ name: 'order_code' })
  @OneToOne(() => Order)
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
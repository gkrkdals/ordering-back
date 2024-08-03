import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "@src/entities/order.entity";

@Entity('order_status')
export class OrderStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @JoinColumn({ name: 'order_code' })
  @OneToOne(() => Order)
  order: Order;

  @JoinColumn({ name: 'status' })
  @OneToOne(() => OrderStatus)
  status: OrderStatus;

  @Column()
  time: Date;
}
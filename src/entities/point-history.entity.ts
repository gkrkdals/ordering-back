import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Order } from "@src/entities/order/order.entity";

@Entity('point_history') // 테이블명 명시
export class PointHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.pointHistories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customerJoin: Customer;

  @Column({ name: 'order_id', nullable: true })
  orderId: number | null;

  // 주문 관련 적립/취소 시 연결 (수동 적립/차감일 땐 null 허용)
  @ManyToOne(() => Order, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  orderJoin: Order | null;

  @Column()
  amount: number;

  @Column({ name: 'path_type', length: 20 })
  pathType: string; // MENU, BOWL, USE, ADMIN_ADD, ADMIN_REMOVE 등

  @Column({ length: 50 })
  description: string; // UI 노출용 (예: 적립금사용, 그릇수거입금 등)

  @Column({ name: 'is_canceled', type: 'tinyint', default: 0 })
  isCanceled: number; // 1: 취소됨 (고동색 처리용)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
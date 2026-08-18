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

  // 한 번의 클라이언트 주문(장바구니)으로 생성된 묶음의 식별자 (첫 번째 주문 행의 id)
  // 관리자 생성 주문 등 묶음이 아닌 주문은 null
  @Column({ name: 'order_group_id', nullable: true })
  orderGroupId: number | null;

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
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer.entity";

@Entity('customer_credit')
export class CustomerCredit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_code' })
  orderCode: number;

  @Column()
  customer: number;

  @JoinColumn({ name: "customer" })
  @OneToOne(() => Customer)
  customerJoin: Customer;

  @Column({ name: 'credit_diff' })
  creditDiff: number;

  @Column()
  time: Date;
}
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { User } from "@src/entities/user.entity";

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

  @Column({ nullable: true })
  status: number | null;

  @Column({ nullable: true })
  by: number;

  @JoinColumn({ name: 'by' })
  @OneToOne(() => User, { nullable: true })
  byJoin: User | null;

  @Column({ name: 'credit_diff' })
  creditDiff: number;

  @Column()
  time: Date;
}
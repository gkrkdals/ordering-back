import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('customer_credit')
export class CustomerCredit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer: number;

  @Column({ name: 'credit_diff' })
  creditDiff: number;

  @Column()
  time: Date;
}
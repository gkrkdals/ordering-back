import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { OrderCategory } from "@src/entities/order/order-category.entity";

@Entity('customer_price')
export class CustomerPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer: number;

  @ManyToOne(() => Customer, (customer) => customer.customerPriceJoin)
  @JoinColumn({ name: 'customer' })
  customerJoin: Customer;

  @Column()
  category: number;

  @OneToOne(() => OrderCategory)
  @JoinColumn({ name: 'category' })
  categoryJoin: OrderCategory;

  @Column()
  price: number;
}
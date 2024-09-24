import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerCategory } from "@src/entities/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";

@Entity()
export class
Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  memo: string;

  @Column()
  floor: string;

  @Column()
  category: number;

  @JoinColumn({ name: 'category' })
  @OneToOne(() => CustomerCategory)
  categoryJoin: CustomerCategory;

  @OneToMany(() => CustomerPrice, (category) => category.customerJoin)
  customerPriceJoin: CustomerPrice[];

  @Column()
  withdrawn: number;
}
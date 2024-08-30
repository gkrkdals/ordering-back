import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerCategory } from "@src/entities/customer-category.entity";

@Entity()
export class Customer {
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
}
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class DiscountGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'discount_type', nullable: true })
  discountType: 'amount' | 'percent' | null;

  @Column({ name: 'discount_value', default: 0.00 })
  discountValue: number;

  @Column({ nullable: true })
  description: string | null;
}
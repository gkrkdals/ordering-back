import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer/customer-price.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { PointHistory } from "@src/entities/point-history.entity";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ default: '', nullable: true })
  tel: string;

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

  @Column({ nullable: true, name: 'recent_order' })
  recentOrder: Date;

  @Column()
  withdrawn: number;

  @Column({ name: 'show_price' })
  showPrice: number;

  @Column({ name: 'hide_order_status' })
  hideOrderStatus: number;

  @Column({ name: 'show_confirm' })
  showConfirm: number;

  @Column({ name: 'discount_group_id', nullable: true })
  discountGroupId: number | null;

  @JoinColumn({ name: 'discount_group_id' })
  @OneToOne(() => DiscountGroup)
  discountGroup: DiscountGroup | null;

  @Column({ name: 'reward_per_menu', default: 0 })
  rewardPerMenu: number;

  @Column({ name: 'reward_per_bowl', default: 0 })
  rewardPerBowl: number;

  @Column({ name: 'point_balance', default: 0 })
  pointBalance: number;

  @Column({ name: 'is_sold_out', type: 'tinyint', default: 0 })
  isSoldOut: number;

  // 적립금 내역과의 1:N 관계 매핑
  @OneToMany(() => PointHistory, (pointHistory) => pointHistory.customerJoin)
  pointHistories: PointHistory[];
}
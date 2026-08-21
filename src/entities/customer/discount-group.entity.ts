import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * 고객 그룹.
 *
 * 이름은 '할인 그룹'에서 출발했지만, 가격·적립 등 그룹 단위 설정 전반을 담는다.
 * 고객은 customer.discount_group_id로 이 그룹에 배정된다.
 */
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

  /** 그룹 기본 메뉴 적립(백원). NULL이면 미설정 */
  @Column({ name: 'reward_per_menu', nullable: true })
  rewardPerMenu: number | null;

  /** 그룹 기본 그릇수거 적립(백원). NULL이면 미설정 */
  @Column({ name: 'reward_per_bowl', nullable: true })
  rewardPerBowl: number | null;
}
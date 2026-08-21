import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";

/**
 * 고객 그룹별 메뉴카테고리 가격.
 *
 * 메뉴 가격은 그룹 단위로만 정한다. 그룹에 값이 없으면 전역 menu_category 가격을 쓴다.
 * (고객별 단가 customer_price는 2026-08-21 폐지되고 이 테이블로 이관됨)
 */
@Entity('group_price')
export class GroupPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'group_id' })
  groupId: number;

  @ManyToOne(() => DiscountGroup)
  @JoinColumn({ name: 'group_id' })
  groupJoin: DiscountGroup;

  /** menu_category.id */
  @Column()
  category: number;

  /** 원 단위 */
  @Column()
  price: number;
}

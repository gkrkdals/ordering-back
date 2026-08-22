import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";

/**
 * 고객 그룹별 메뉴 품절 상태.
 *
 * menu.sold_out 이 전역 컬럼이라 그룹별 상태를 담을 곳이 없어 따로 둔다.
 * 행이 없는 메뉴는 전역 menu.sold_out 을 따른다.
 */
@Entity('group_menu_sold_out')
export class GroupMenuSoldOut {
  @PrimaryColumn({ name: 'group_id' })
  groupId: number;

  @ManyToOne(() => DiscountGroup)
  @JoinColumn({ name: 'group_id' })
  groupJoin: DiscountGroup;

  @PrimaryColumn()
  menu: number;

  @Column({ name: 'sold_out', type: 'tinyint', default: 0 })
  soldOut: number;
}

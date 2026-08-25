import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 메뉴별 판매 가능 시간 (그룹별·요일별).
 *
 * 행이 없는 (그룹, 메뉴, 요일)은 시간 제약이 없다는 뜻이며,
 * stringValue 형식과 자정 넘김 규칙은 그릇수거 시간과 동일하다.
 * 그룹 행이 하나도 없으면 전역(group_id = 0) 스케줄을 따른다.
 */
@Entity('menu_schedule')
export class MenuSchedule {
  /** 0 = 전역(전체 공통), 그 외는 discount_group.id */
  @PrimaryColumn({ name: 'group_id' })
  groupId: number;

  @PrimaryColumn()
  menu: number;

  /** 요일 1=월 … 7=일 */
  @PrimaryColumn()
  sml: number;

  /** 'HH:MM~HH:MM'. null이면 그 요일은 제약 없음 */
  @Column({ name: 'string_value', nullable: true })
  stringValue: string | null;
}

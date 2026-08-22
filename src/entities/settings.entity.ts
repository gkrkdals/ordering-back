import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** 전역(전체 공통) 설정을 가리키는 group_id */
export const GLOBAL_GROUP_ID = 0;

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  big: number | null;

  @Column({ nullable: true })
  sml: number | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  value: number | null;

  @Column({ nullable: true, name: 'string_value' })
  stringValue: string | null;

  /**
   * 이 설정이 속한 고객 그룹. 0이면 전역(전체 공통)이다.
   *
   * 그룹 행이 없으면 전역 행을 따르므로, 조회는 반드시
   * CustomerSettingsService 의 폴백 헬퍼를 거쳐야 한다.
   */
  @Column({ name: 'group_id', default: GLOBAL_GROUP_ID })
  groupId: number;
}
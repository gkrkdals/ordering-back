/** 메뉴 판매시간 한 요일치. 네 칸 중 하나라도 비면 그 요일은 제약 없음이 된다 */
export class UpdateMenuScheduleDto {
  /** 요일 1=월 … 7=일 */
  sml: number;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

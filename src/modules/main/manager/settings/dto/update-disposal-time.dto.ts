/**
 * 요일별 그릇 수거 가능 시간 저장 요청.
 * sml 은 요일 인덱스입니다. (1=월 … 7=일)
 */
export class UpdateDisposalTimeDto {
  sml: number;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}
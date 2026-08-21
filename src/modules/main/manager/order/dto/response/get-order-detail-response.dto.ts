/**
 * 관리자 주문 수정 화면에서 기존 값을 그대로 불러오기 위한 주문 상세 응답.
 *
 * 목록 조회(getOrderStatus)의 request 컬럼은 미수 탭에서 memo 값으로 대체되므로,
 * 수정 화면은 반드시 이 응답으로 원본 값을 받아야 한다.
 */
export class GetOrderDetailResponseDto {
  orderCode: number;
  menu: number;
  menuName: string;
  /** 원 단위 */
  price: number;
  request: string;
}

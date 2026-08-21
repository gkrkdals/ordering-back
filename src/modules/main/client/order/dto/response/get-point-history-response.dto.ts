/** 고객 화면의 '적립금 내역' 한 줄 */
export class PointHistoryItemDto {
  id: number;
  /** MENU | BOWL | USE | CANCELED | ADMIN_ADD | ADMIN_REMOVE */
  pathType: string;
  /** 백원 단위 (화면에는 * 100 하여 원으로 표시) */
  amount: number;
  /** 1이면 회수된 적립 (적립취소) */
  isCanceled: number;
  description: string;
  /** 적립이 발생한 주문의 메뉴명. 주문이 삭제된 과거 이력은 null */
  menuName: string | null;
  createdAt: Date;
}

export class GetPointHistoryResponseDto {
  /** 현재 적립금 잔액 (백원 단위) */
  balance: number;
  histories: PointHistoryItemDto[];
}

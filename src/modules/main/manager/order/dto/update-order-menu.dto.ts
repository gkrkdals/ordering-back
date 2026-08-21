export class UpdateOrderMenuDto {
  orderCode: number;
  from: number;
  /** 변경 후 메뉴 id. 생략하거나 음수면 기존 메뉴를 유지한다. */
  to?: number;
  /** 원 단위. 생략하면 기존 가격을 유지한다. */
  price?: number;
  /** 생략하면 기존 요청사항을 유지한다. */
  request?: string;
}

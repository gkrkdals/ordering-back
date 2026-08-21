interface PriceData {
  /** menu_category.id */
  id: number;
  /** 천원 단위 입력값. 빈 문자열이면 해당 카테고리의 그룹 가격을 지운다 */
  price: string;
}

export class UpdateGroupPriceDto {
  groupId: number;
  data: PriceData[];
}

/**
 * 메뉴 가격·적립 해석 규칙.
 *
 * 값이 정해지는 우선순위는 **고객 그룹 > 전역**이다.
 * (고객별 단가는 2026-08-21 요구로 폐지되고 그룹 단가로 이관되었다)
 * 이 파일은 순수 함수만 두고, 실제 조회는 CustomerSettingsService가 맡는다.
 */

/** 가격 계산에 필요한 값 묶음. CustomerSettingsService.loadPriceContext()가 만든다. */
export interface PriceContext {
  /** 그룹 가격 (menu_category.id → 원). 없으면 전역 menu_category 가격을 쓴다 */
  groupPrices: Record<number, number>;
  /** 그룹 할인 */
  discountType: 'amount' | 'percent' | null;
  discountValue: number;
  /** 전역 웹할인 (원) */
  webDiscount: number;
}

/** 가격 계산에 필요한 메뉴의 최소 정보 */
export interface PricedMenu {
  category: number;
  isDiscountable: number;
  menuCategory?: { price: number } | null;
}

export const EMPTY_PRICE_CONTEXT: PriceContext = {
  groupPrices: {},
  discountType: null,
  discountValue: 0,
  webDiscount: 0,
};

/**
 * 메뉴 한 건의 최종 가격을 계산합니다.
 *
 * 기준가(그룹 > menu_category)에 그룹 할인과 웹할인을 차례로 적용하며,
 * 할인 불가 메뉴(is_discountable = 0)에는 두 할인 모두 적용하지 않습니다.
 */
export function resolveMenuPrice(menu: PricedMenu, context: PriceContext): number {
  const basePrice = menu.menuCategory?.price ?? 0;

  // 기준가: 그룹 > 전역(menu_category)
  let price = context.groupPrices[menu.category] ?? basePrice;

  if (menu.isDiscountable !== 1) {
    return price;
  }

  if (context.discountType === 'amount') {
    price -= context.discountValue;
  } else if (context.discountType === 'percent') {
    price *= (100 - context.discountValue) * 0.01;
  }

  return price - context.webDiscount;
}

/**
 * 메뉴 목록의 가격을 제자리에서 갱신합니다. (기존 코드가 menuCategory.price를 덮어쓰던 방식과 동일)
 */
export function applyMenuPrices<T extends PricedMenu>(menus: T[], context: PriceContext): T[] {
  menus.forEach(menu => {
    if (menu.menuCategory) {
      menu.menuCategory.price = resolveMenuPrice(menu, context);
    }
  });

  return menus;
}

/**
 * 적립액을 해석합니다. 단위는 백원.
 *
 * 고객 컬럼은 NOT NULL DEFAULT 0이라 '미설정'과 '0원 적립'이 구분되지 않으므로
 * **0은 미설정으로 보고 그룹 값으로 폴백**한다. 적립을 끄려면 그룹 값을 0으로 둔다.
 */
export function resolveReward(customerValue: number | null, groupValue: number | null): number {
  if (customerValue) {
    return customerValue;
  }

  return groupValue ?? 0;
}

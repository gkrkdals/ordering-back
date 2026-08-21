import { EMPTY_PRICE_CONTEXT, PriceContext, resolveMenuPrice, resolveReward } from "@src/utils/price";

/** menu_category 기본가 7,000원, 할인 가능한 메뉴 */
function menu(category = 1, isDiscountable = 1, basePrice = 7000) {
  return { category, isDiscountable, menuCategory: { price: basePrice } };
}

function context(partial: Partial<PriceContext> = {}): PriceContext {
  return { ...EMPTY_PRICE_CONTEXT, ...partial };
}

describe('resolveMenuPrice — 기준가 우선순위', () => {
  it('아무 설정이 없으면 menu_category 가격을 쓴다', () => {
    expect(resolveMenuPrice(menu(), context())).toBe(7000);
  });

  it('그룹 가격이 있으면 전역 가격보다 우선한다', () => {
    expect(resolveMenuPrice(menu(), context({ groupPrices: { 1: 6500 } }))).toBe(6500);
  });

  it('다른 카테고리의 그룹 가격은 영향을 주지 않는다', () => {
    expect(resolveMenuPrice(menu(2), context({ groupPrices: { 1: 6500 } }))).toBe(7000);
  });
});

describe('resolveMenuPrice — 할인 적용', () => {
  it('정액 할인은 기준가에서 뺀다', () => {
    const ctx = context({ discountType: 'amount', discountValue: 500 });
    expect(resolveMenuPrice(menu(), ctx)).toBe(6500);
  });

  it('정률 할인은 기준가에 비율을 곱한다', () => {
    const ctx = context({ discountType: 'percent', discountValue: 10 });
    expect(resolveMenuPrice(menu(), ctx)).toBe(6300);
  });

  it('할인은 그룹 가격이 아니라 최종 기준가에 적용된다', () => {
    const ctx = context({ groupPrices: { 1: 6000 }, discountType: 'amount', discountValue: 500 });
    expect(resolveMenuPrice(menu(), ctx)).toBe(5500);
  });

  it('웹할인은 그룹 할인 다음에 뺀다', () => {
    const ctx = context({ discountType: 'amount', discountValue: 500, webDiscount: 1000 });
    expect(resolveMenuPrice(menu(), ctx)).toBe(5500);
  });

  it('할인 불가 메뉴는 그룹 할인도 웹할인도 받지 않는다', () => {
    const ctx = context({ groupPrices: { 1: 6500 }, discountType: 'percent', discountValue: 10, webDiscount: 1000 });
    // 기준가(그룹 가격)는 그대로 적용되고 할인만 빠진다
    expect(resolveMenuPrice(menu(1, 0), ctx)).toBe(6500);
  });
});

describe('resolveReward — 적립 폴백', () => {
  it('고객 값이 있으면 고객 값을 쓴다', () => {
    expect(resolveReward(5, 3)).toBe(5);
  });

  it('고객 값이 0(미설정)이면 그룹 값을 쓴다', () => {
    expect(resolveReward(0, 3)).toBe(3);
  });

  it('그룹 값도 없으면 0이다', () => {
    expect(resolveReward(0, null)).toBe(0);
    expect(resolveReward(null, null)).toBe(0);
  });

  it('그룹 값이 0이면 적립을 끈 것으로 본다', () => {
    expect(resolveReward(0, 0)).toBe(0);
  });
});

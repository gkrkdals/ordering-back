import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";

describe('CustomerSettingsService (그룹 > 전역)', () => {
  let service: CustomerSettingsService;
  let customerRepoMock: any;
  let groupPriceRepoMock: any;
  let discountGroupRepoMock: any;
  let settingsRepoMock: any;

  const GROUP_ID = 3;

  beforeEach(() => {
    customerRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 1, discountGroupId: GROUP_ID, rewardPerMenu: 0, rewardPerBowl: 0,
      }),
    };
    groupPriceRepoMock = { findBy: jest.fn().mockResolvedValue([]) };
    discountGroupRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({
        id: GROUP_ID, discountType: null, discountValue: 0, rewardPerMenu: null, rewardPerBowl: null,
      }),
    };
    // 웹할인 (big=5, sml=1)
    settingsRepoMock = { findOneBy: jest.fn().mockResolvedValue({ value: 0 }) };

    service = new CustomerSettingsService(
      customerRepoMock,
      groupPriceRepoMock,
      discountGroupRepoMock,
      settingsRepoMock,
    );
  });

  describe('loadPriceContext', () => {
    it('그룹 가격을 카테고리별로 담아 온다', async () => {
      groupPriceRepoMock.findBy.mockResolvedValue([{ category: 1, price: 6500 }, { category: 2, price: 8000 }]);

      const context = await service.loadPriceContext({ id: 1, discountGroupId: GROUP_ID });

      expect(context.groupPrices).toEqual({ 1: 6500, 2: 8000 });
      expect(groupPriceRepoMock.findBy).toHaveBeenCalledWith({ groupId: GROUP_ID });
    });

    it('그룹이 없는 고객은 그룹 가격·할인을 조회하지 않는다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue({
        id: 1, discountGroupId: null, rewardPerMenu: 0, rewardPerBowl: 0,
      });

      const context = await service.loadPriceContext({ id: 1 });

      expect(groupPriceRepoMock.findBy).not.toHaveBeenCalled();
      expect(discountGroupRepoMock.findOneBy).not.toHaveBeenCalled();
      expect(context.groupPrices).toEqual({});
      expect(context.discountType).toBeNull();
    });

    it('그룹 할인과 전역 웹할인을 함께 싣는다', async () => {
      discountGroupRepoMock.findOneBy.mockResolvedValue({
        id: GROUP_ID, discountType: 'percent', discountValue: 10,
      });
      settingsRepoMock.findOneBy.mockResolvedValue({ value: 500 });

      const context = await service.loadPriceContext({ id: 1, discountGroupId: GROUP_ID });

      expect(context.discountType).toBe('percent');
      expect(context.discountValue).toBe(10);
      expect(context.webDiscount).toBe(500);
    });

    it('JWT처럼 그룹 id가 없는 고객 정보는 DB에서 채워 읽는다', async () => {
      await service.loadPriceContext({ id: 1 });

      expect(customerRepoMock.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(groupPriceRepoMock.findBy).toHaveBeenCalledWith({ groupId: GROUP_ID });
    });

    it('JWT에 담긴 낡은 그룹 id가 아니라 DB의 현재 그룹을 쓴다', async () => {
      // 로그인 시 발급한 JWT에는 고객 행이 통째로 들어가므로 그룹을 옮겨도 값이 낡아 있다
      await service.loadPriceContext({ id: 1, discountGroupId: 99 });

      expect(groupPriceRepoMock.findBy).toHaveBeenCalledWith({ groupId: GROUP_ID });
    });
  });

  describe('resolveBasePrice', () => {
    const menu = { category: 1, isDiscountable: 1, menuCategory: { price: 7000 } };

    it('할인은 빼고 기준가(그룹 > 전역)만 계산한다', async () => {
      groupPriceRepoMock.findBy.mockResolvedValue([{ category: 1, price: 6500 }]);
      discountGroupRepoMock.findOneBy.mockResolvedValue({
        id: GROUP_ID, discountType: 'amount', discountValue: 1000,
      });
      settingsRepoMock.findOneBy.mockResolvedValue({ value: 500 });

      // 할인 1,000원과 웹할인 500원이 적용되지 않아야 한다
      expect(await service.resolveBasePrice({ id: 1, discountGroupId: GROUP_ID }, menu)).toBe(6500);
    });
  });

  describe('resolveRewards', () => {
    it('고객 값이 0이면 그룹 값을 쓴다', async () => {
      discountGroupRepoMock.findOneBy.mockResolvedValue({
        id: GROUP_ID, rewardPerMenu: 5, rewardPerBowl: 3,
      });

      expect(await service.resolveRewards({ id: 1 })).toEqual({ perMenu: 5, perBowl: 3 });
    });

    it('고객 값이 있으면 그룹 값보다 우선한다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue({
        id: 1, discountGroupId: GROUP_ID, rewardPerMenu: 10, rewardPerBowl: 0,
      });
      discountGroupRepoMock.findOneBy.mockResolvedValue({
        id: GROUP_ID, rewardPerMenu: 5, rewardPerBowl: 3,
      });

      expect(await service.resolveRewards({ id: 1 })).toEqual({ perMenu: 10, perBowl: 3 });
    });

    it('JWT에 담긴 낡은 적립값이 아니라 DB의 현재 값을 쓴다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue({
        id: 1, discountGroupId: null, rewardPerMenu: 7, rewardPerBowl: 4,
      });

      expect(await service.resolveRewards({ id: 1, rewardPerMenu: 999, rewardPerBowl: 999 }))
        .toEqual({ perMenu: 7, perBowl: 4 });
    });

    it('그룹이 없고 고객 값도 없으면 0이다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue({
        id: 1, discountGroupId: null, rewardPerMenu: 0, rewardPerBowl: 0,
      });

      expect(await service.resolveRewards({ id: 1 })).toEqual({ perMenu: 0, perBowl: 0 });
      expect(discountGroupRepoMock.findOneBy).not.toHaveBeenCalled();
    });
  });
});

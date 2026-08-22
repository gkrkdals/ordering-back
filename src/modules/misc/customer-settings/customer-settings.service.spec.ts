import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";

describe('CustomerSettingsService (그룹 > 전역)', () => {
  let service: CustomerSettingsService;
  let customerRepoMock: any;
  let groupPriceRepoMock: any;
  let groupSoldOutRepoMock: any;
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
    groupSoldOutRepoMock = { findBy: jest.fn().mockResolvedValue([]), delete: jest.fn() };
    discountGroupRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({
        id: GROUP_ID, discountType: null, discountValue: 0, rewardPerMenu: null, rewardPerBowl: null,
      }),
    };
    // 웹할인 (big=5, sml=1)
    settingsRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ value: 0 }),
      findBy: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (row: any) => ({ ...row, id: 100 })),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    service = new CustomerSettingsService(
      customerRepoMock,
      groupPriceRepoMock,
      groupSoldOutRepoMock,
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

  describe('loadSoldOutMap', () => {
    it('그룹 품절 행을 메뉴 id 맵으로 돌려준다', async () => {
      groupSoldOutRepoMock.findBy.mockResolvedValue([
        { groupId: GROUP_ID, menu: 5, soldOut: 1 },
        { groupId: GROUP_ID, menu: 7, soldOut: 0 },
      ]);

      expect(await service.loadSoldOutMap({ id: 1 })).toEqual({ 5: 1, 7: 0 });
    });

    it('그룹이 없는 고객은 조회하지 않고 빈 맵을 준다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue({ id: 1, discountGroupId: null });

      expect(await service.loadSoldOutMap({ id: 1 })).toEqual({});
      expect(groupSoldOutRepoMock.findBy).not.toHaveBeenCalled();
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

describe('CustomerSettingsService — settings 그룹 폴백', () => {
  let service: CustomerSettingsService;
  let settingsRepoMock: any;

  const GROUP_ID = 3;
  const GLOBAL = { id: 1, big: 4, sml: 1, name: '월요일', value: null, stringValue: '09:00~20:00', groupId: 0 };
  const GROUP = { id: 2, big: 4, sml: 1, name: '월요일', value: null, stringValue: '11:00~15:00', groupId: GROUP_ID };

  beforeEach(() => {
    settingsRepoMock = {
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn().mockImplementation(async (row: any) => ({ ...row, id: 99 })),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    service = new CustomerSettingsService(
      { findOneBy: jest.fn().mockResolvedValue({ id: 1, discountGroupId: GROUP_ID }) } as any,
      { findBy: jest.fn().mockResolvedValue([]) } as any,
      { findBy: jest.fn().mockResolvedValue([]), delete: jest.fn() } as any,
      { findOneBy: jest.fn().mockResolvedValue(null) } as any,
      settingsRepoMock,
    );
  });

  describe('getSetting', () => {
    it('그룹 행이 있으면 그룹 값을 쓴다', async () => {
      settingsRepoMock.findOneBy.mockImplementation(async (where: any) =>
        where.groupId === GROUP_ID ? GROUP : GLOBAL);

      expect(await service.getSetting(4, 1, GROUP_ID)).toBe(GROUP);
    });

    it('그룹 행이 없으면 전역 행으로 폴백한다', async () => {
      settingsRepoMock.findOneBy.mockImplementation(async (where: any) =>
        where.groupId === 0 ? GLOBAL : null);

      expect(await service.getSetting(4, 1, GROUP_ID)).toBe(GLOBAL);
      expect(settingsRepoMock.findOneBy).toHaveBeenLastCalledWith({ big: 4, sml: 1, groupId: 0 });
    });

    it('그룹을 지정하지 않으면 전역 행만 본다', async () => {
      settingsRepoMock.findOneBy.mockResolvedValue(GLOBAL);

      await service.getSetting(4, 1, null);

      expect(settingsRepoMock.findOneBy).toHaveBeenCalledTimes(1);
      expect(settingsRepoMock.findOneBy).toHaveBeenCalledWith({ big: 4, sml: 1, groupId: 0 });
    });
  });

  describe('getSettings', () => {
    it('그룹 세트가 하나라도 있으면 그룹 세트를 쓴다', async () => {
      settingsRepoMock.findBy.mockImplementation(async (where: any) =>
        where.groupId === GROUP_ID ? [GROUP] : [GLOBAL]);

      expect(await service.getSettings(4, GROUP_ID)).toEqual([GROUP]);
    });

    it('그룹 세트가 비어 있으면 전역 세트를 쓴다', async () => {
      settingsRepoMock.findBy.mockImplementation(async (where: any) =>
        where.groupId === GROUP_ID ? [] : [GLOBAL]);

      expect(await service.getSettings(4, GROUP_ID)).toEqual([GLOBAL]);
    });
  });

  describe('ensureGroupRows', () => {
    it('그룹 행이 없으면 전역 값을 복사해 만든다', async () => {
      settingsRepoMock.findBy.mockImplementation(async (where: any) =>
        where.groupId === 0 ? [GLOBAL] : []);

      const rows = await service.ensureGroupRows(4, GROUP_ID);

      expect(settingsRepoMock.save).toHaveBeenCalledWith(expect.objectContaining({
        big: 4, sml: 1, stringValue: '09:00~20:00', groupId: GROUP_ID,
      }));
      expect(rows).toHaveLength(1);
    });

    it('이미 있는 그룹 행은 건드리지 않는다', async () => {
      settingsRepoMock.findBy.mockImplementation(async (where: any) =>
        where.groupId === 0 ? [GLOBAL] : [GROUP]);

      await service.ensureGroupRows(4, GROUP_ID);

      expect(settingsRepoMock.save).not.toHaveBeenCalled();
    });

    it('전역(0)에는 행을 만들지 않는다', async () => {
      settingsRepoMock.findBy.mockResolvedValue([GLOBAL]);

      await service.ensureGroupRows(4, 0);

      expect(settingsRepoMock.save).not.toHaveBeenCalled();
    });
  });

  it('그룹을 지우면 그 그룹의 설정 행도 지운다', async () => {
    await service.deleteGroupSettings(GROUP_ID);
    expect(settingsRepoMock.delete).toHaveBeenCalledWith({ groupId: GROUP_ID });

    settingsRepoMock.delete.mockClear();
    await service.deleteGroupSettings(0);
    expect(settingsRepoMock.delete).not.toHaveBeenCalled();
  });
});

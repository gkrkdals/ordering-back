import { BadRequestException } from "@nestjs/common";
import { OrderService } from "@src/modules/main/client/order/services/order.service";
import { Order } from "@src/entities/order/order.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";

describe('OrderService (적립금)', () => {
  let service: OrderService;
  let em: any;
  let customerQb: any;
  let customerRepoMock: any;
  let orderRepoMock: any;
  let menuRepoMock: any;
  let pointHistoryRepoMock: any;
  let creditRepoMock: any;
  let settingsRepoMock: any;
  let gatewayMock: any;
  let fcmMock: any;
  let noAlarmsMock: any;
  let customerSettingsMock: any;

  function createService() {
    const repoByEntity = new Map<any, any>([
      [Order, orderRepoMock],
      [Customer, customerRepoMock],
      [Menu, menuRepoMock],
      [PointHistory, pointHistoryRepoMock],
      [CustomerCredit, creditRepoMock],
    ]);

    em = {
      getRepository: jest.fn((entity) => repoByEntity.get(entity)),
      query: jest.fn(),
    };

    const datasource = {
      transaction: jest.fn(async (cb: (em: any) => Promise<void>) => cb(em)),
    };

    gatewayMock = {
      refresh: jest.fn(), refreshClient: jest.fn(),
      newOrder: jest.fn(), checkRequest: jest.fn(),
    };
    fcmMock = { newOrder: jest.fn(), checkRequest: jest.fn() };
    noAlarmsMock = { isNoAlarm: jest.fn().mockResolvedValue(false) };
    // 적립액·가격 해석은 CustomerSettingsService가 담당한다 (고객 개별 > 그룹 > 전역)
    customerSettingsMock = {
      resolveRewards: jest.fn().mockResolvedValue({ perMenu: 5, perBowl: 0 }),
      loadPriceContext: jest.fn().mockResolvedValue({
        groupPrices: {}, discountType: null, discountValue: 0, webDiscount: 0,
      }),
      // 최소 사용 적립금(big=7) — 그룹 값이 없으면 전역 3,000원
      getSettingForCustomer: jest.fn().mockResolvedValue({ value: 3000 }),
    };

    service = new OrderService(
      {} as any,               // orderCategoryRepository
      orderRepoMock,           // orderRepository
      {} as any,               // orderStatusRepository
      creditRepoMock,          // customerCreditRepository
      menuRepoMock,            // menuRepository
      customerRepoMock,        // customerRepository
      {} as any,               // discountGroupRepository
      settingsRepoMock,        // settingsRepository
      datasource as any,       // datasource
      pointHistoryRepoMock,    // pointHistoryRepository
      gatewayMock,             // orderGateway
      fcmMock,                 // fcmService
      noAlarmsMock,            // noAlarmsService
      customerSettingsMock,    // customerSettingsService
    );
  }

  function createQb(affected: number) {
    const qb: any = {};
    qb.update = jest.fn(() => qb);
    qb.set = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.setParameters = jest.fn(() => qb);
    qb.execute = jest.fn().mockResolvedValue({ affected });
    return qb;
  }

  beforeEach(() => {
    customerQb = createQb(1);
    customerRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, pointBalance: 100, rewardPerMenu: 5 }),
      createQueryBuilder: jest.fn(() => customerQb),
      increment: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    let nextOrderId = 10;
    orderRepoMock = {
      save: jest.fn().mockImplementation(async (order: any) => ({ ...order, id: order.id ?? nextOrderId++ })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    menuRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, soldOut: 0, isRewardable: 1 }),
    };
    pointHistoryRepoMock = { insert: jest.fn().mockResolvedValue(undefined), find: jest.fn().mockResolvedValue([]) };
    creditRepoMock = { insert: jest.fn().mockResolvedValue(undefined) };
    settingsRepoMock = {
      // 최소 사용 금액(원). 사용 단위는 설정이 아닌 상수(1,000원)입니다.
      findOneBy: jest.fn().mockResolvedValue({ big: 7, sml: 1, value: 3000 }),
    };
    createService();
  });

  describe('usePoint', () => {
    it('정수가 아닌 금액은 거부한다', async () => {
      await expect(service.usePoint({ id: 1 } as any, 3500.5)).rejects.toThrow(BadRequestException);
      expect(pointHistoryRepoMock.insert).not.toHaveBeenCalled();
    });

    it('1,000원 단위가 아니면 거부한다', async () => {
      await expect(service.usePoint({ id: 1 } as any, 3050))
        .rejects.toThrow('3,000원 이상 1,000원단위');
      expect(pointHistoryRepoMock.insert).not.toHaveBeenCalled();
    });

    it('최소 사용 금액 미만이면 거부한다', async () => {
      await expect(service.usePoint({ id: 1 } as any, 2000))
        .rejects.toThrow('3,000원 이상 1,000원단위');
    });

    it('사용 단위에 맞지 않으면 거부한다', async () => {
      await expect(service.usePoint({ id: 1 } as any, 3500))
        .rejects.toThrow('3,000원 이상 1,000원단위');
    });

    it('설정 행이 없으면 기본값(3,000원 이상 1,000원단위)을 적용한다', async () => {
      settingsRepoMock.findOneBy.mockResolvedValue(null);
      await expect(service.usePoint({ id: 1 } as any, 2000))
        .rejects.toThrow('3,000원 이상 1,000원단위');
    });

    it('잔액 부족(원자 갱신 실패) 시 이력을 남기지 않고 거부한다', async () => {
      customerQb.execute.mockResolvedValue({ affected: 0 });
      await expect(service.usePoint({ id: 1 } as any, 5000))
        .rejects.toThrow('적립금 잔액이 부족합니다');
      expect(pointHistoryRepoMock.insert).not.toHaveBeenCalled();
      expect(creditRepoMock.insert).not.toHaveBeenCalled();
    });

    it('성공 시 원 단위 금액이 백원 단위 잔액으로 환산되어 차감된다', async () => {
      await service.usePoint({ id: 1 } as any, 5000);

      expect(customerQb.setParameters).toHaveBeenCalledWith({ id: 1, used: 50 }); // 5,000원 / 100
      expect(pointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 1,
        amount: -50,
        pathType: PointEnum.USE,
      }));
      expect(creditRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        customer: 1,
        creditDiff: 5000, // 잔금은 원 단위로 기록
        memo: '적립금 사용',
      }));
      expect(gatewayMock.refresh).toHaveBeenCalled();
    });

    it('사용 단위는 설정과 무관하게 1,000원 고정이다', async () => {
      // 설정 행이 어떤 값이든 100원 단위 금액은 허용되지 않는다
      await expect(service.usePoint({ id: 1 } as any, 3100))
        .rejects.toThrow('3,000원 이상 1,000원단위');
      // 최소 금액만 조회하며, 사용 단위는 설정이 아닌 상수다
      expect(customerSettingsMock.getSettingForCustomer).toHaveBeenCalledWith(7, 1, { id: 1 });
    });
  });

  describe('addOrder', () => {
    const orderedMenus = [
      { menu: { id: 1, menuCategory: { price: 9000 } }, request: '' },
    ];

    it('빈 주문 목록은 거부한다', async () => {
      await expect(service.addOrder({ id: 1 } as any, { orderedMenus: [] } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('주문 시 적립금 사용은 일어나지 않고 MENU 적립만 수행된다', async () => {
      await service.addOrder({ id: 1 } as any, { orderedMenus } as any);

      // 사용(USE) 경로 제거: 조건부 차감·USE 이력·잔금 기록 없음
      expect(customerQb.execute).not.toHaveBeenCalled();
      expect(creditRepoMock.insert).not.toHaveBeenCalled();

      // MENU 적립 이력 + increment
      expect(pointHistoryRepoMock.insert).toHaveBeenCalledTimes(1);
      expect(pointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5, pathType: PointEnum.MENU, orderId: 10,
      }));
      expect(customerRepoMock.increment).toHaveBeenCalledWith({ id: 1 }, 'pointBalance', 5);

      // 주문 금액은 그대로 유지 (적립금 할인 없음)
      const savedOrders = orderRepoMock.save.mock.calls.map(call => call[0]);
      expect(savedOrders.every(order => order.price === 9000)).toBe(true);

      // 엔티티 통째 저장 대신 recentOrder만 갱신
      expect(customerRepoMock.update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ recentOrder: expect.any(Date) }),
      );
    });

    it('같은 장바구니의 주문들에 첫 주문 id를 묶음 식별자로 부여한다', async () => {
      const threeMenus = [
        { menu: { id: 1, menuCategory: { price: 9000 } }, request: '' },
        { menu: { id: 2, menuCategory: { price: 8000 } }, request: '' },
        { menu: { id: 3, menuCategory: { price: 7000 } }, request: '' },
      ];

      await service.addOrder({ id: 1 } as any, { orderedMenus: threeMenus } as any);

      // 생성된 주문 id: 10, 11, 12 → 그룹 id는 첫 주문의 10
      const groupUpdateCall = orderRepoMock.update.mock.calls.find(
        call => call[1].orderGroupId !== undefined,
      );
      expect(groupUpdateCall).toBeDefined();
      expect(groupUpdateCall[0].id._value).toEqual([10, 11, 12]);
      expect(groupUpdateCall[1]).toEqual({ orderGroupId: 10 });
    });

    it('적립 불가 메뉴는 MENU 이력을 남기지 않는다', async () => {
      menuRepoMock.findOneBy.mockResolvedValue({ id: 1, soldOut: 0, isRewardable: 0 });
      await service.addOrder({ id: 1 } as any, { orderedMenus } as any);
      expect(pointHistoryRepoMock.insert).not.toHaveBeenCalled();
      expect(customerRepoMock.increment).not.toHaveBeenCalled();
    });
  });
  describe('getPointHistory', () => {
    const CUSTOMER = { id: 1 } as any;

    it('본인 이력만 조회하고 잔액을 함께 반환한다', async () => {
      pointHistoryRepoMock.find.mockResolvedValue([
        {
          id: 3, customerId: 1, amount: 5, pathType: PointEnum.MENU, isCanceled: 0,
          description: '주문 메뉴 적립금', createdAt: new Date('2026-08-20T10:00:00'),
          orderJoin: { id: 10, menuJoin: { name: '제육덮밥' } },
        },
      ]);

      const result = await service.getPointHistory(CUSTOMER);

      const findOptions = pointHistoryRepoMock.find.mock.calls[0][0];
      expect(findOptions.where).toEqual({ customerId: 1 });
      expect(findOptions.take).toBe(500);

      expect(result.balance).toBe(100);
      expect(result.histories).toEqual([
        expect.objectContaining({
          id: 3, pathType: PointEnum.MENU, amount: 5, isCanceled: 0, menuName: '제육덮밥',
        }),
      ]);
    });

    it('화면에는 시간 순(오래된 것 → 최신)으로 내려준다', async () => {
      // 상한에 걸려도 최신 건이 남도록 DB에서는 최신순으로 뽑는다
      pointHistoryRepoMock.find.mockResolvedValue([
        { id: 3, amount: 5, pathType: PointEnum.MENU, isCanceled: 0, createdAt: new Date('2026-08-20T12:00:00') },
        { id: 2, amount: 5, pathType: PointEnum.MENU, isCanceled: 0, createdAt: new Date('2026-08-20T10:00:00') },
        { id: 1, amount: 5, pathType: PointEnum.MENU, isCanceled: 0, createdAt: new Date('2026-08-19T10:00:00') },
      ]);

      const result = await service.getPointHistory(CUSTOMER);

      expect(pointHistoryRepoMock.find.mock.calls[0][0].order).toEqual({ createdAt: 'DESC', id: 'DESC' });
      expect(result.histories.map(history => history.id)).toEqual([1, 2, 3]);
    });

    it('날짜를 주면 영업일 기준(09시 시작) 범위로 거른다', async () => {
      await service.getPointHistory(CUSTOMER, '2026-08-19', '2026-08-20');

      const { createdAt } = pointHistoryRepoMock.find.mock.calls[0][0].where;
      // Between(시작, 끝) — 시작은 19일 09:00, 끝은 21일 08:59:59
      // (범위 문자열이 초 단위라 밀리초는 잘린다 — 주문내역 조회와 동일)
      expect(createdAt._value[0]).toEqual(new Date('2026-08-19T09:00:00'));
      expect(createdAt._value[1]).toEqual(new Date('2026-08-21T08:59:59'));
    });

    it('날짜가 한쪽만 오면 기간 조건 없이 최근 건을 준다', async () => {
      await service.getPointHistory(CUSTOMER, '2026-08-19', undefined);

      expect(pointHistoryRepoMock.find.mock.calls[0][0].where).toEqual({ customerId: 1 });
    });

    it('회수된 적립은 is_canceled 값을 그대로 내려 화면에서 적립취소로 표시할 수 있다', async () => {
      pointHistoryRepoMock.find.mockResolvedValue([
        {
          id: 4, customerId: 1, amount: 5, pathType: PointEnum.MENU, isCanceled: 1,
          description: '주문 메뉴 적립금', createdAt: new Date(), orderJoin: null,
        },
      ]);

      const result = await service.getPointHistory(CUSTOMER);

      expect(result.histories[0].isCanceled).toBe(1);
      // 주문이 삭제되면 order_id가 SET NULL 되므로 메뉴명이 없을 수 있다
      expect(result.histories[0].menuName).toBeNull();
    });

    it('고객 정보를 찾지 못해도 잔액 0으로 응답한다', async () => {
      customerRepoMock.findOneBy.mockResolvedValue(null);

      const result = await service.getPointHistory(CUSTOMER);

      expect(result.balance).toBe(0);
      expect(result.histories).toEqual([]);
    });
  });
});

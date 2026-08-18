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

    service = new OrderService(
      {} as any,               // orderCategoryRepository
      orderRepoMock,           // orderRepository
      {} as any,               // orderStatusRepository
      {} as any,               // customerPriceRepository
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
    pointHistoryRepoMock = { insert: jest.fn().mockResolvedValue(undefined) };
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
      expect(settingsRepoMock.findOneBy).toHaveBeenCalledTimes(1); // 최소 금액만 조회
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
});

import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { Order } from "@src/entities/order/order.entity";
import { OrderStatus } from "@src/entities/order/order-status.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import { StatusEnum } from "@src/types/enum/StatusEnum";

describe('OrderModifyService.cancelOrder (적립금)', () => {
  let service: OrderModifyService;
  let em: any;
  let orderStatusRepoMock: any;
  let emOrderStatusRepoMock: any;
  let emOrderRepoMock: any;
  let emCreditRepoMock: any;
  let emCustomerRepoMock: any;
  let emPointHistoryRepoMock: any;
  let gatewayMock: any;

  const ORDER_CODE = 5;
  const CUSTOMER_ID = 7;

  beforeEach(() => {
    // 트랜잭션 외부에서 쓰는 리포지토리
    orderStatusRepoMock = {
      findOne: jest.fn().mockResolvedValue({
        id: 1, orderCode: ORDER_CODE, status: StatusEnum.InPreparation,
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    // 트랜잭션 내부(em) 리포지토리
    emOrderStatusRepoMock = { save: jest.fn().mockResolvedValue(undefined) };
    emOrderRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ id: ORDER_CODE, customer: CUSTOMER_ID, orderGroupId: null }),
      find: jest.fn().mockResolvedValue([]),
    };
    emCreditRepoMock = {
      delete: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    emCustomerRepoMock = {
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
    };
    emPointHistoryRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const repoByEntity = new Map<any, any>([
      [OrderStatus, emOrderStatusRepoMock],
      [Order, emOrderRepoMock],
      [CustomerCredit, emCreditRepoMock],
      [Customer, emCustomerRepoMock],
      [PointHistory, emPointHistoryRepoMock],
    ]);

    em = { getRepository: jest.fn((entity) => repoByEntity.get(entity)) };

    const datasource = {
      transaction: jest.fn(async (cb: (em: any) => Promise<void>) => cb(em)),
    };

    gatewayMock = { refresh: jest.fn(), refreshClient: jest.fn(), clearAlarm: jest.fn() };

    service = new OrderModifyService(
      {} as any,                // orderRepository
      orderStatusRepoMock,      // orderStatusRepository
      {} as any,                // customerCreditRepository
      {} as any,                // orderChangeRepository
      {} as any,                // pointHistoryRepository
      {} as any,                // customerRepository
      datasource as any,        // datasource
      gatewayMock,              // orderGateway
      {} as any,                // fcmService
      {} as any,                // noAlarmsService
    );
  });

  it('취소 시 음수(미수) 잔금 기록만 삭제한다 — 양수 기록 이중 차감 방지', async () => {
    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    expect(emCreditRepoMock.delete).toHaveBeenCalledTimes(1);
    const deleteArg = emCreditRepoMock.delete.mock.calls[0][0];
    expect(deleteArg.orderCode).toBe(ORDER_CODE);
    // creditDiff 조건(LessThan) 없이 전체 삭제하면 안 됨
    expect(deleteArg.creditDiff).toBeDefined();
  });

  it('USE 내역이 있으면 CANCELED 역행·잔액 복구·취소 memo 잔금 기록을 수행한다', async () => {
    emPointHistoryRepoMock.findOneBy.mockImplementation(async (where: any) => {
      if (where.pathType === PointEnum.USE) {
        return {
          id: 3, customerId: CUSTOMER_ID, orderId: ORDER_CODE,
          amount: -50, pathType: PointEnum.USE, description: '주문 적립금 사용', isCanceled: 0,
        };
      }
      return null;
    });

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    expect(emPointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      pathType: PointEnum.CANCELED,
      amount: 50,
    }));
    expect(emCustomerRepoMock.increment).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 50);
    expect(emCreditRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      orderCode: ORDER_CODE,
      customer: CUSTOMER_ID,
      creditDiff: -5000,
      memo: '적립금 사용 취소',
      time: expect.any(Date),
    }));
  });

  it('이미 CANCELED 내역이 있으면 USE 역행을 반복하지 않는다', async () => {
    emPointHistoryRepoMock.findOneBy.mockImplementation(async (where: any) => {
      if (where.pathType === PointEnum.CANCELED) {
        return { id: 4, pathType: PointEnum.CANCELED };
      }
      return null;
    });

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
    expect(emCustomerRepoMock.increment).not.toHaveBeenCalled();
  });

  it('묶음이 아닌 주문의 MENU 적립은 해당 건만 잔액 차감 후 is_canceled 플래그로 처리한다', async () => {
    emPointHistoryRepoMock.find.mockResolvedValue([
      { id: 8, orderId: ORDER_CODE, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 },
    ]);

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    // 묶음 식별자가 없으므로 취소된 주문 id만 조회 대상
    const findWhere = emPointHistoryRepoMock.find.mock.calls[0][0].where;
    expect(findWhere.orderId._value).toEqual([ORDER_CODE]);

    expect(emCustomerRepoMock.decrement).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 5);
    expect(emPointHistoryRepoMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
      { isCanceled: 1 },
    );
  });

  it('묶음 주문은 하나만 취소해도 묶음 전체의 MENU 적립을 회수한다', async () => {
    const GROUP_ID = ORDER_CODE;
    emOrderRepoMock.findOneBy.mockResolvedValue({
      id: ORDER_CODE, customer: CUSTOMER_ID, orderGroupId: GROUP_ID,
    });
    emOrderRepoMock.find.mockResolvedValue([
      { id: ORDER_CODE }, { id: ORDER_CODE + 1 }, { id: ORDER_CODE + 2 },
    ]);
    emPointHistoryRepoMock.find.mockResolvedValue([
      { id: 8, orderId: ORDER_CODE, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 },
      { id: 9, orderId: ORDER_CODE + 1, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 },
      { id: 10, orderId: ORDER_CODE + 2, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 },
    ]);

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    // 묶음 전체 주문 id로 이력 조회
    const findWhere = emPointHistoryRepoMock.find.mock.calls[0][0].where;
    expect(findWhere.orderId._value).toEqual([ORDER_CODE, ORDER_CODE + 1, ORDER_CODE + 2]);

    // 3건 합산(15)을 한 번에 차감하고 전부 플래그 처리
    expect(emCustomerRepoMock.decrement).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 15);
    const updateIds = emPointHistoryRepoMock.update.mock.calls[0][0].id._value;
    expect(updateIds).toEqual([8, 9, 10]);
  });

  it('묶음의 다른 주문을 이어서 취소해도 이미 회수된 적립은 다시 차감하지 않는다', async () => {
    emOrderRepoMock.findOneBy.mockResolvedValue({
      id: ORDER_CODE + 1, customer: CUSTOMER_ID, orderGroupId: ORDER_CODE,
    });
    emOrderRepoMock.find.mockResolvedValue([{ id: ORDER_CODE }, { id: ORDER_CODE + 1 }]);
    // 앞선 취소에서 전부 is_canceled=1 처리됨 → 조회 결과 없음
    emPointHistoryRepoMock.find.mockResolvedValue([]);

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Manager } as any, 1);

    expect(emCustomerRepoMock.decrement).not.toHaveBeenCalled();
    expect(emPointHistoryRepoMock.update).not.toHaveBeenCalled();
  });

  it('조리 시작 이후 주문은 매니저가 아니면 취소할 수 없다', async () => {
    orderStatusRepoMock.findOne.mockResolvedValue({
      id: 1, orderCode: ORDER_CODE, status: StatusEnum.WaitingForDelivery,
    });

    await service.cancelOrder({ id: 1, permission: PermissionEnum.Cook } as any, 1);

    expect(emOrderStatusRepoMock.save).not.toHaveBeenCalled();
    expect(emCreditRepoMock.delete).not.toHaveBeenCalled();
  });
});

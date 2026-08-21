import { OrderModifyService } from "@src/modules/main/manager/order/services/order-modify.service";
import { Order } from "@src/entities/order/order.entity";
import { OrderChange } from "@src/entities/order/order-change.entity";
import { Menu } from "@src/entities/menu/menu.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";

describe('OrderModifyService.updateOrderMenu (선택적 수정 · 적립금 취소)', () => {
  let service: OrderModifyService;
  let em: any;
  let emOrderRepoMock: any;
  let emOrderChangeRepoMock: any;
  let emMenuRepoMock: any;
  let emCreditRepoMock: any;
  let emCustomerRepoMock: any;
  let emPointHistoryRepoMock: any;
  let gatewayMock: any;

  const ORDER_CODE = 5;
  const CUSTOMER_ID = 7;
  const MENU_ID = 11;
  const USER = { id: 2 } as any;

  const currentOrder = () => ({
    id: ORDER_CODE,
    customer: CUSTOMER_ID,
    menu: MENU_ID,
    price: 6000,
    request: '덜맵게',
  });

  beforeEach(() => {
    emOrderRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(currentOrder()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    emOrderChangeRepoMock = { save: jest.fn().mockResolvedValue(undefined) };
    emMenuRepoMock = { findOneBy: jest.fn(async ({ id }: any) => ({ id, name: `메뉴${id}` })) };
    emCreditRepoMock = {
      findBy: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    emCustomerRepoMock = {
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
    };
    emPointHistoryRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const repoByEntity = new Map<any, any>([
      [Order, emOrderRepoMock],
      [OrderChange, emOrderChangeRepoMock],
      [Menu, emMenuRepoMock],
      [CustomerCredit, emCreditRepoMock],
      [Customer, emCustomerRepoMock],
      [PointHistory, emPointHistoryRepoMock],
    ]);

    em = { getRepository: jest.fn((entity) => repoByEntity.get(entity)) };

    const datasource = {
      transaction: jest.fn(async (cb: (em: any) => Promise<any>) => cb(em)),
    };

    gatewayMock = { refresh: jest.fn(), refreshClient: jest.fn(), clearAlarm: jest.fn() };

    service = new OrderModifyService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      datasource as any,
      gatewayMock,
      {} as any,
      {} as any,
    );
  });

  /** 해당 주문에 살아있는 MENU 적립 5포인트가 있는 상황 */
  function withMenuPoint() {
    emPointHistoryRepoMock.findOneBy.mockImplementation(async (where: any) => {
      if (where.pathType === PointEnum.MENU) {
        return { id: 9, orderId: ORDER_CODE, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 };
      }
      return null;
    });
  }

  it('바뀐 값이 없으면 주문도 적립금도 건드리지 않는다', async () => {
    withMenuPoint();

    const result = await service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID, price: 6000, request: '덜맵게',
    }, USER);

    expect(result).toEqual({ changed: false });
    expect(emOrderRepoMock.save).not.toHaveBeenCalled();
    expect(emOrderChangeRepoMock.save).not.toHaveBeenCalled();
    expect(emCustomerRepoMock.decrement).not.toHaveBeenCalled();
    expect(emCreditRepoMock.delete).not.toHaveBeenCalled();
    expect(gatewayMock.refresh).not.toHaveBeenCalled();
  });

  it('값을 보내지 않은 항목은 기존 값을 유지한다', async () => {
    await service.updateOrderMenu({ orderCode: ORDER_CODE, from: MENU_ID, request: '많이맵게' }, USER);

    const saved = emOrderRepoMock.save.mock.calls[0][0];
    expect(saved.menu).toBe(MENU_ID);
    expect(saved.price).toBe(6000);
    expect(saved.request).toBe('많이맵게');
  });

  it('요청사항만 바뀌어도 메뉴 적립금은 취소한다', async () => {
    withMenuPoint();

    await service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID, price: 6000, request: '많이맵게',
    }, USER);

    expect(emCustomerRepoMock.decrement).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 5);
    expect(emPointHistoryRepoMock.update).toHaveBeenCalledWith({ id: 9 }, { isCanceled: 1 });
    // 가격이 그대로면 잔금(미수) 기록은 다시 쓰지 않는다
    expect(emCreditRepoMock.delete).not.toHaveBeenCalled();
    expect(emCreditRepoMock.save).not.toHaveBeenCalled();
  });

  it('가격만 바뀌면 미수 기록만 새로 쓰고 적립금은 유지한다', async () => {
    withMenuPoint();

    await service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID, price: 7000, request: '덜맵게',
    }, USER);

    expect(emCreditRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ orderCode: ORDER_CODE, customer: CUSTOMER_ID, creditDiff: -7000 })
    );
    expect(emCustomerRepoMock.decrement).not.toHaveBeenCalled();
    expect(emPointHistoryRepoMock.update).not.toHaveBeenCalled();
  });

  it('미수 기록을 다시 쓸 때 적립금 사용 취소 보정 기록은 지우지 않는다', async () => {
    emCreditRepoMock.findBy.mockResolvedValue([
      { id: 21, creditDiff: -6000, memo: null },
      { id: 22, creditDiff: -5000, memo: '적립금 사용 취소' },
    ]);

    await service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID, price: 7000, request: '덜맵게',
    }, USER);

    expect(emCreditRepoMock.delete).toHaveBeenCalledTimes(1);
    expect(emCreditRepoMock.delete.mock.calls[0][0].id._value).toEqual([21]);
  });

  it('메뉴가 바뀌면 메뉴 적립금과 그릇수거 적립금을 모두 회수한다', async () => {
    emPointHistoryRepoMock.findOneBy.mockImplementation(async (where: any) => {
      if (where.pathType === PointEnum.MENU) {
        return { id: 9, orderId: ORDER_CODE, amount: 5, pathType: PointEnum.MENU, isCanceled: 0 };
      }
      if (where.pathType === PointEnum.BOWL) {
        return { id: 10, orderId: ORDER_CODE, amount: 3, pathType: PointEnum.BOWL, isCanceled: 0 };
      }
      return null;
    });

    await service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID + 1, price: 8000, request: '덜맵게',
    }, USER);

    expect(emOrderRepoMock.save.mock.calls[0][0].menu).toBe(MENU_ID + 1);
    expect(emOrderChangeRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ orderCode: ORDER_CODE, from: MENU_ID, to: MENU_ID + 1, by: USER.id })
    );
    expect(emCustomerRepoMock.decrement).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 3);
    expect(emCustomerRepoMock.decrement).toHaveBeenCalledWith({ id: CUSTOMER_ID }, 'pointBalance', 5);
    expect(gatewayMock.refresh).toHaveBeenCalled();
  });

  it('존재하지 않는 메뉴로는 변경할 수 없다', async () => {
    emMenuRepoMock.findOneBy.mockResolvedValue(null);

    await expect(service.updateOrderMenu({
      orderCode: ORDER_CODE, from: MENU_ID, to: 999, price: 6000, request: '덜맵게',
    }, USER)).rejects.toThrow();

    expect(emOrderRepoMock.save).not.toHaveBeenCalled();
  });
});

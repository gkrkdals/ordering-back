import { BadRequestException } from "@nestjs/common";
import { DishDisposalService } from "@src/modules/main/client/order/services/dish-disposal.service";
import { OrderStatus } from "@src/entities/order/order-status.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";
import { StatusEnum } from "@src/types/enum/StatusEnum";

describe('DishDisposalService.createDishDisposal (BOWL 적립)', () => {
  let service: DishDisposalService;
  let em: any;
  let emOrderStatusRepoMock: any;
  let emCustomerRepoMock: any;
  let emPointHistoryRepoMock: any;
  let settingsRepoMock: any;
  let gatewayMock: any;
  let fcmMock: any;
  let customerSettingsMock: any;

  const ORDER_CODE = 42;
  // JWT에 실린 낡은 값(3)과 DB의 현재 값(7)을 다르게 두어 fresh 값 사용을 검증
  const jwtCustomer = { id: 1, rewardPerBowl: 3 } as any;
  const body = { disposal: { order_code: ORDER_CODE }, location: '문 앞' } as any;

  beforeEach(() => {
    emOrderStatusRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    emCustomerRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, rewardPerBowl: 7, pointBalance: 0 }),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    emPointHistoryRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(undefined),
    };

    const repoByEntity = new Map<any, any>([
      [OrderStatus, emOrderStatusRepoMock],
      [Customer, emCustomerRepoMock],
      [PointHistory, emPointHistoryRepoMock],
    ]);

    em = {
      getRepository: jest.fn((entity) => repoByEntity.get(entity)),
      query: jest.fn().mockResolvedValue([]),
    };

    const datasource = {
      transaction: jest.fn(async (cb: (em: any) => Promise<void>) => cb(em)),
    };

    // 그릇수거 가능 시간 미설정 → 종일 허용
    settingsRepoMock = { findBy: jest.fn().mockResolvedValue([]) };
    gatewayMock = { newDishDisposal: jest.fn(), refresh: jest.fn() };
    // 적립액 해석은 CustomerSettingsService가 담당한다 (고객 개별 > 그룹)
    customerSettingsMock = { resolveRewards: jest.fn().mockResolvedValue({ perMenu: 0, perBowl: 7 }) };
    fcmMock = { newDishDisposal: jest.fn().mockResolvedValue(undefined) };

    service = new DishDisposalService(
      {} as any,            // orderStatusRepository
      {} as any,            // customerRepository
      settingsRepoMock,     // settingsRepository
      datasource as any,    // datasource
      gatewayMock,          // orderGateway
      fcmMock,              // fcmService
      customerSettingsMock, // customerSettingsService
    );
  });

  it('성공 시 이력과 잔액 모두 해석된 적립액(고객 개별 > 그룹)으로 반영한다', async () => {
    await service.createDishDisposal(jwtCustomer, body);

    expect(emOrderStatusRepoMock.save).toHaveBeenCalledWith(expect.objectContaining({
      orderCode: ORDER_CODE,
      status: StatusEnum.InPickingUp,
    }));
    expect(emPointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 1,
      orderId: ORDER_CODE,
      amount: 7, // JWT의 3이 아닌 해석된 값 7
      pathType: PointEnum.BOWL,
    }));
    expect(emCustomerRepoMock.increment).toHaveBeenCalledWith({ id: 1 }, 'pointBalance', 7);
  });

  it('적립액이 0이면 수거 요청만 남기고 적립 이력은 만들지 않는다', async () => {
    customerSettingsMock.resolveRewards.mockResolvedValue({ perMenu: 0, perBowl: 0 });

    await service.createDishDisposal(jwtCustomer, body);

    expect(emOrderStatusRepoMock.save).toHaveBeenCalled();
    expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
    expect(emCustomerRepoMock.increment).not.toHaveBeenCalled();
  });

  it('이미 BOWL 이력이 있으면 중복 적립을 거부한다', async () => {
    emPointHistoryRepoMock.findOneBy.mockResolvedValue({ id: 9, pathType: PointEnum.BOWL });

    await expect(service.createDishDisposal(jwtCustomer, body))
      .rejects.toThrow('이미 그릇수거가 요청된 주문입니다');

    expect(emOrderStatusRepoMock.save).not.toHaveBeenCalled();
    expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
    expect(emCustomerRepoMock.increment).not.toHaveBeenCalled();
  });

  it('이미 수거중 상태가 있으면 중복 요청을 거부한다', async () => {
    emOrderStatusRepoMock.findOneBy.mockResolvedValue({ id: 3, status: StatusEnum.InPickingUp });

    await expect(service.createDishDisposal(jwtCustomer, body))
      .rejects.toThrow(BadRequestException);

    expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
  });

  it('동시 요청 직렬화를 위해 주문 행을 잠근다', async () => {
    await service.createDishDisposal(jwtCustomer, body);
    expect(em.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), [ORDER_CODE]);
  });
});

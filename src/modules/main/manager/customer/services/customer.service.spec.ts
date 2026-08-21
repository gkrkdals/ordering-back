import { BadRequestException } from "@nestjs/common";
import { CustomerService } from "@src/modules/main/manager/customer/services/customer.service";
import { Customer } from "@src/entities/customer/customer.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";

describe('CustomerService (적립금)', () => {
  let service: CustomerService;
  let customerRepoMock: any;
  let emCustomerRepoMock: any;
  let emPointHistoryRepoMock: any;
  let customerQb: any;

  function createQb(affected: number) {
    const qb: any = {};
    qb.update = jest.fn(() => qb);
    qb.set = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.execute = jest.fn().mockResolvedValue({ affected });
    return qb;
  }

  beforeEach(() => {
    customerQb = createQb(1);
    customerRepoMock = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    emCustomerRepoMock = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, pointBalance: 30 }),
      createQueryBuilder: jest.fn(() => customerQb),
    };
    emPointHistoryRepoMock = { insert: jest.fn().mockResolvedValue(undefined) };

    const repoByEntity = new Map<any, any>([
      [Customer, emCustomerRepoMock],
      [PointHistory, emPointHistoryRepoMock],
    ]);

    const em = { getRepository: jest.fn((entity) => repoByEntity.get(entity)) };
    const datasource = {
      transaction: jest.fn(async (cb: (em: any) => Promise<void>) => cb(em)),
    };

    service = new CustomerService(
      customerRepoMock,   // customerRepository
      {} as any,          // customerCategoryRepository
      {} as any,          // discountGroupRepository
      {} as any,          // groupPriceRepository
      {} as any,          // pointHistoryRepository
      datasource as any,  // datasource
    );
  });

  describe('adjustPoint', () => {
    it('정수가 아니거나 0 이하인 금액은 거부한다', async () => {
      await expect(service.adjustPoint(1, 0, 1.5, '')).rejects.toThrow(BadRequestException);
      await expect(service.adjustPoint(1, 0, 0, '')).rejects.toThrow(BadRequestException);
      await expect(service.adjustPoint(1, 0, -10, '')).rejects.toThrow(BadRequestException);
      expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
    });

    it('지급 시 ADMIN_ADD 이력을 남긴다', async () => {
      await service.adjustPoint(1, 0, 50, '이벤트 지급');

      expect(emPointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 1,
        amount: 50,
        pathType: PointEnum.ADMIN_ADD,
        description: '이벤트 지급',
      }));
    });

    it('차감 시 ADMIN_REMOVE 이력을 남긴다', async () => {
      await service.adjustPoint(1, 1, 20, '오적립 회수');

      expect(emPointHistoryRepoMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        amount: -20,
        pathType: PointEnum.ADMIN_REMOVE,
      }));
    });

    it('잔액을 초과하는 차감(원자 갱신 실패)은 이력 없이 거부한다', async () => {
      customerQb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.adjustPoint(1, 1, 999, '')).rejects.toThrow('적립금 잔액이 부족합니다');
      expect(emPointHistoryRepoMock.insert).not.toHaveBeenCalled();
    });

    it('존재하지 않는 고객은 거부한다', async () => {
      emCustomerRepoMock.findOneBy.mockResolvedValue(null);
      await expect(service.adjustPoint(99, 0, 10, '')).rejects.toThrow('존재하지 않는 고객입니다');
    });
  });

  describe('updateCustomer', () => {
    it('요청 본문의 point_balance로 잔액을 덮어쓰지 않는다', async () => {
      const existing = { id: 1, pointBalance: 55 } as any;
      customerRepoMock.findOneBy.mockResolvedValue(existing);

      await service.updateCustomer({
        id: 1,
        name: '고객',
        address: '주소',
        memo: '',
        category: 3,
        floor: '1',
        tel: '',
        discount_group_id: -1,
        is_sold_out: 0,
        point_balance: 9999,
        rewardPerBowl: 1,
        rewardPerMenu: 2,
      } as any);

      expect(customerRepoMock.save).toHaveBeenCalledTimes(1);
      const saved = customerRepoMock.save.mock.calls[0][0];
      expect(saved.pointBalance).toBe(55);
      expect(saved.rewardPerBowl).toBe(1);
      expect(saved.rewardPerMenu).toBe(2);
    });
  });
});

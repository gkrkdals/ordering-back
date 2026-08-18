import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order/order-category.entity";
import { DataSource, In, LessThan, Not, Repository } from "typeorm";
import { CreateOrderDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { Order } from "@src/entities/order/order.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderSql } from "@src/modules/main/client/order/sql/OrderSql";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { CustomerPrice } from "@src/entities/customer/customer-price.entity";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { OrderStatus } from "@src/entities/order/order-status.entity";
import { getOrderAvailableTimes } from "@src/utils/date";
import { Menu } from "@src/entities/menu/menu.entity";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";
import { NoAlarmsService } from "@src/modules/misc/no-alarms/no-alarms.service";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderStatus)
    private orderStatusRepository: Repository<OrderStatus>,
    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(DiscountGroup)
    private readonly discountGroupRepository: Repository<DiscountGroup>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectDataSource()
    private readonly datasource: DataSource,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepository: Repository<PointHistory>,

    private readonly orderGateway: OrderGateway,
    private readonly fcmService: FirebaseService,
    private readonly noAlarmsService: NoAlarmsService,
  ) {}

  getOrderCategories(): Promise<OrderCategory[]> {
    return this.orderCategoryRepository.findBy({ status: LessThan(StatusEnum.AwaitingPickup) });
  }

  async getRecentRequests(customer: Customer) {
    const recentRequests = await this.orderRepository.find({
      where: {
        customer: customer.id,
        request: Not('')
      },
      order: { id: 'desc' },
      take: 2
    });
    return recentRequests.map(req => req.request);
  }

  async getLastOrders(customer: Customer) {
    const groupId = customer.discountGroupId;
    let type: 'amount' | 'percent' | '' = '', value = 0;
    const webDiscountValue = (await this.settingsRepository.findOneBy({ big: 5, sml: 1 })).value ?? 0;
    const customPricesArray = await this.customerPriceRepository.findBy({ customer: customer.id });
    const customPrices: any = {};

    // 커스텀 가격 설정
    customPricesArray.forEach((item) => {
      customPrices[item.category] = item.price;
    })

    // 할인 그룹에 속해있으면 할인 타입과 금액 설정
    if (groupId) {
      const group = await this.discountGroupRepository.findOneBy({ id: groupId });
      if (group) {
        type = group.discountType;
        value = group.discountValue;
      }
    }

    const recentMenuOnDigit: { id: number; menu: number }[] = await this.orderRepository.query(
      `SELECT 
        MAX(o.id) AS id, 
        o.menu FROM \`order\` o
      LEFT JOIN menu m ON o.menu = m.id
      WHERE o.customer = ? AND o.menu != 0 AND m.withdrawn != 1 
      GROUP BY menu ORDER BY id DESC LIMIT 10`,
      [customer.id]
    );

    // 데이터 찾아옴
    const recentMenus: Menu[] = [];
    for (const menuKey of recentMenuOnDigit) {
      const menu = await this.menuRepository.findOne({
        where: {
          id: menuKey.menu
        },
        relations: {
          menuCategory: true
        }
      });
      recentMenus.push(menu);
    }

    recentMenus.forEach((item) => {
      const customPrice = customPrices[item.category];
      if (customPrice) {
        item.menuCategory.price = customPrice;
      }
    })

    // 할인 그룹에 있을 시 할인 타입에 따라 할인
    if (type === 'amount') {
      recentMenus.forEach(item => {
        if (item.isDiscountable === 1) {
          item.menuCategory.price -= value
        }
      });
    } else if (type === 'percent') {
      recentMenus.forEach(item => {
        if (item.isDiscountable === 1) {
          item.menuCategory.price *= ((100 - value) * 0.01);
        }
      });
    }

    recentMenus.forEach(item => {
      if (item.isDiscountable === 1) {
        item.menuCategory.price -= webDiscountValue;
      }

      if (customer.isSoldOut === 1) {
        item.soldOut = 1;
      }
    })

    return recentMenus
  }

  async getCredit(customer: Customer) {
    const result = await this.customerCreditRepository
      .createQueryBuilder()
      .select('SUM(credit_diff)', 'credit')
      .where('customer = :customer', { customer: customer.id })
      .groupBy('customer')
      .getRawOne<{ credit: string }>();

    return result ? parseInt(result.credit) : 0;
  }

  async getSummaryCount() {
    const [first, last] = getOrderAvailableTimes();
    return this.orderStatusRepository.query(OrderSql.getOrderStatusCounts, [first, last, StatusEnum.AwaitingPickup]);
  }

  getOrderSummaries(customer: Customer): Promise<OrderSummaryResponseDto[]> {
    const [first, last] = getOrderAvailableTimes();
    return this.datasource.query(OrderSql.getOrderStatus, [customer.id, first, last]);
  }

  async addOrder(customer: JwtCustomer, om: CreateOrderDto): Promise<void> {
    const { orderedMenus } = om;

    if (!Array.isArray(orderedMenus) || orderedMenus.length === 0) {
      throw new BadRequestException();
    }

    const isThereAnyRequest = orderedMenus.some(menu => menu.request && menu.request.length !== 0);

    // 주문 생성·적립·잔금 기록을 하나의 트랜잭션으로 묶음
    // 적립금 '사용'은 주문에 귀속되지 않고 usePoint 단독 경로로만 이뤄진다
    await this.datasource.transaction(async (em) => {
      const targetCustomer = await em.getRepository(Customer).findOneBy({ id: customer.id });
      if (!targetCustomer) {
        throw new BadRequestException('존재하지 않는 고객입니다');
      }

      const createdOrderIds: number[] = [];

      for(const orderedMenu of orderedMenus) {
        const newOrder = new Order();
        const currentMenu = await em.getRepository(Menu).findOneBy({ id: orderedMenu.menu.id });

        // 메뉴가 품절이 된 경우
        if (currentMenu.soldOut === 1) {
          throw new BadRequestException();
        } else {
          newOrder.price = orderedMenu.menu.menuCategory.price;
          newOrder.path = null;
          newOrder.customer = customer.id;
          newOrder.menu = orderedMenu.menu.id;
          newOrder.request = orderedMenu.request;
          const orderMade = await em.getRepository(Order).save(newOrder);
          createdOrderIds.push(orderMade.id);

          // 메뉴 '적립' 로직 (적립 가능한 메뉴만)
          if (currentMenu.isRewardable === 1) {
            await em.getRepository(PointHistory).insert({
              customerId: targetCustomer.id,
              amount: targetCustomer.rewardPerMenu,
              orderId: orderMade.id,
              description: '주문 메뉴 적립금',
              pathType: PointEnum.MENU,
            });

            await em.getRepository(Customer).increment(
              { id: targetCustomer.id },
              'pointBalance',
              targetCustomer.rewardPerMenu,
            );
          }
        }
      }

      // 같은 장바구니에서 생성된 주문들을 하나의 묶음으로 식별 (첫 번째 주문 행의 id를 그룹 id로 사용)
      await em.getRepository(Order).update(
        { id: In(createdOrderIds) },
        { orderGroupId: createdOrderIds[0] },
      );

      // 잔액은 위에서 원자적으로 갱신되므로 최근 주문 시각만 갱신 (엔티티 통째 저장 금지)
      await em.getRepository(Customer).update({ id: targetCustomer.id }, { recentOrder: new Date() });
    });

    this.orderGateway.refresh();
    this.orderGateway.refreshClient();

    const noAlarm = await this.noAlarmsService.isNoAlarm(orderedMenus.at(0).menu.id);
    if (isThereAnyRequest) {
      this.orderGateway.checkRequest(noAlarm);
      await this.fcmService.checkRequest();
    } else {
      this.orderGateway.newOrder(noAlarm);
      await this.fcmService.newOrder();
    }
  }

  async usePoint(customer: JwtCustomer, point: number): Promise<void> {
    // 정수(천원 단위)만 허용
    if (!point || !Number.isInteger(point) || point <= 0) {
      throw new BadRequestException('올바른 적립금 사용 금액을 입력해주세요');
    }

    const minPointSetting = await this.settingsRepository.findOneBy({ big: 7, sml: 1 });
    const minPoint = minPointSetting ? (minPointSetting.value ?? 3000) : 3000;
    if (point * 1000 < minPoint) {
      throw new BadRequestException(`${minPoint.toLocaleString()}원 이상 사용 가능합니다`);
    }

    const requiredPointBalance = point * 10;

    // 잔액 차감·이력·잔금 기록을 하나의 트랜잭션으로 묶음
    await this.datasource.transaction(async (em) => {
      const targetCustomer = await em.getRepository(Customer).findOneBy({ id: customer.id });
      if (!targetCustomer) {
        throw new BadRequestException('존재하지 않는 고객입니다');
      }

      // 1. 조건부 원자 차감: 동시 요청이 겹쳐도 잔액이 음수가 될 수 없음
      const result = await em.getRepository(Customer).createQueryBuilder()
        .update()
        .set({ pointBalance: () => 'point_balance - :used' })
        .where('id = :id AND point_balance >= :used')
        .setParameters({ id: targetCustomer.id, used: requiredPointBalance })
        .execute();

      if (result.affected === 0) {
        throw new BadRequestException('적립금 잔액이 부족합니다');
      }

      // 2. 적립금 사용 이력 기록
      await em.getRepository(PointHistory).insert({
        customerId: targetCustomer.id,
        amount: -requiredPointBalance,
        orderId: null, // 특정 주문과 묶이지 않은 단독 사용
        description: '적립금 사용',
        pathType: PointEnum.USE,
      });

      // 3. 고객 신용(외상) 테이블에 '마스터 입금' 형태로 차감액 기록 (1포인트당 1000원 환산)
      await em.getRepository(CustomerCredit).insert({
        orderCode: 0, // 단독 사용이므로 임의 코드 0
        customer: targetCustomer.id,
        creditDiff: point * 1000,
        time: new Date(),
        memo: '적립금 사용',
        status: null,
      });
    });

    // 4. 실시간 소켓 갱신 알림 (커밋 후)
    this.orderGateway.refresh();
    this.orderGateway.refreshClient();
  }
}
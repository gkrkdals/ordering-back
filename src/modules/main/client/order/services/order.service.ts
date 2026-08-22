import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order/order-category.entity";
import { Between, DataSource, In, LessThan, Not, Repository } from "typeorm";
import { CreateOrderDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
import { Order } from "@src/entities/order/order.entity";
import { Customer } from "@src/entities/customer/customer.entity";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { OrderSql } from "@src/modules/main/client/order/sql/OrderSql";
import { OrderSummaryResponseDto } from "@src/modules/main/client/order/dto/response/order-summary-response.dto";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { OrderStatus } from "@src/entities/order/order-status.entity";
import { getBusinessDayRange, getOrderAvailableTimes } from "@src/utils/date";
import { Menu } from "@src/entities/menu/menu.entity";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";
import { NoAlarmsService } from "@src/modules/misc/no-alarms/no-alarms.service";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";
import { PointHistory } from "@src/entities/point-history.entity";
import { PointEnum } from "@src/types/enum/PointEnum";
import { POINT_USE_UNIT } from "@src/types/point";
import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";
import { applyMenuPrices } from "@src/utils/price";
import { GetPointHistoryResponseDto } from "@src/modules/main/client/order/dto/response/get-point-history-response.dto";

/** 고객 화면에 내려주는 적립금 내역의 최대 건수 */
const POINT_HISTORY_LIMIT = 500;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderCategory)
    private orderCategoryRepository: Repository<OrderCategory>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderStatus)
    private orderStatusRepository: Repository<OrderStatus>,
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
    private readonly customerSettingsService: CustomerSettingsService,
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
    // 가격은 고객 개별 > 그룹 > 전역 순으로 해석된다 (utils/price.ts)
    const priceContext = await this.customerSettingsService.loadPriceContext(customer);

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

    applyMenuPrices(recentMenus, priceContext);

    if (customer.isSoldOut === 1) {
      recentMenus.forEach(item => { item.soldOut = 1; });
    }

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

    // 적립액은 고객 개별 > 그룹 순으로 해석한다 (트랜잭션 밖에서 미리 확정)
    const { perMenu: rewardPerMenu } = await this.customerSettingsService.resolveRewards(customer);

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
          if (currentMenu.isRewardable === 1 && rewardPerMenu > 0) {
            await em.getRepository(PointHistory).insert({
              customerId: targetCustomer.id,
              amount: rewardPerMenu,
              orderId: orderMade.id,
              description: '주문 메뉴 적립금',
              pathType: PointEnum.MENU,
            });

            await em.getRepository(Customer).increment(
              { id: targetCustomer.id },
              'pointBalance',
              rewardPerMenu,
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

  async usePoint(customer: JwtCustomer, amount: number): Promise<void> {
    // amount는 '원' 단위 정수
    if (!amount || !Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('올바른 적립금 사용 금액을 입력해주세요');
    }

    // 최소 사용 금액은 고객이 속한 그룹 값 → 전역 값 순으로 해석한다
    const minPointSetting = await this.customerSettingsService.getSettingForCustomer(7, 1, customer);
    const minPoint = minPointSetting?.value ?? 3000;

    // 고객 화면의 안내 문구와 동일한 문장으로 거절 사유를 알린다
    const policyMessage =
      `${minPoint.toLocaleString()}원 이상 ${POINT_USE_UNIT.toLocaleString()}원단위`;

    if (amount < minPoint || amount % POINT_USE_UNIT !== 0) {
      throw new BadRequestException(policyMessage);
    }

    const requiredPointBalance = amount / 100;

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

      // 3. 고객 신용(외상) 테이블에 '마스터 입금' 형태로 차감액(원) 기록
      await em.getRepository(CustomerCredit).insert({
        orderCode: 0, // 단독 사용이므로 임의 코드 0
        customer: targetCustomer.id,
        creditDiff: amount,
        time: new Date(),
        memo: '적립금 사용',
        status: null,
      });
    });

    // 4. 실시간 소켓 갱신 알림 (커밋 후)
    this.orderGateway.refresh();
    this.orderGateway.refreshClient();
  }

  /**
   * 고객이 자신의 적립금 내역을 조회합니다.
   *
   * 적립 취소(MENU/BOWL)는 별도 행이 아니라 원본 적립 행의 is_canceled 플래그로 남으므로,
   * 화면에서는 해당 행을 '적립취소'로 표시한다.
   *
   * @param customer JWT에서 얻은 본인 정보
   * @param startDate 조회 시작일 (yyyy-MM-dd). 생략하면 최근 건부터
   * @param endDate 조회 종료일 (yyyy-MM-dd)
   */
  async getPointHistory(
    customer: JwtCustomer,
    startDate?: string,
    endDate?: string,
  ): Promise<GetPointHistoryResponseDto> {
    // 주문내역 조회와 같은 영업일 규칙(09시 시작)을 쓴다
    let period = {};
    if (startDate && endDate) {
      // created_at은 Date 컬럼이므로 문자열 범위를 Date로 바꿔 넘긴다
      const [start, end] = getBusinessDayRange(startDate, endDate);
      period = { createdAt: Between(new Date(start), new Date(end)) };
    }

    const [histories, targetCustomer] = await Promise.all([
      // 상한에 걸릴 때 잘려나가는 쪽이 오래된 건이 되도록 최신순으로 뽑은 뒤 뒤집는다
      this.pointHistoryRepository.find({
        where: { customerId: customer.id, ...period },
        relations: { orderJoin: { menuJoin: true } },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: POINT_HISTORY_LIMIT,
      }),
      this.customerRepository.findOneBy({ id: customer.id }),
    ]);

    // 화면에는 시간 순(오래된 것 → 최신)으로 보여준다
    histories.reverse();

    return {
      // 목록만 최신이고 잔액이 낡는 일이 없도록 잔액도 함께 내려준다
      balance: targetCustomer?.pointBalance ?? 0,
      histories: histories.map(history => ({
        id: history.id,
        pathType: history.pathType,
        amount: history.amount,
        isCanceled: history.isCanceled,
        description: history.description,
        // 주문 삭제 시 order_id가 SET NULL 되므로 과거 이력은 메뉴명이 없을 수 있다
        menuName: history.orderJoin?.menuJoin?.name ?? null,
        createdAt: history.createdAt,
      })),
    };
  }
}

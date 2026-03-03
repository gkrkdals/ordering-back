import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { OrderCategory } from "@src/entities/order/order-category.entity";
import { DataSource, LessThan, Not, Repository } from "typeorm";
import { OrderedMenuDto, OrderMenuWithPointDto } from "@src/modules/main/client/order/dto/ordered-menu.dto";
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

  async addOrder(customer: JwtCustomer, om: OrderMenuWithPointDto): Promise<void> {
    const { orderedMenus, point } = om;

    const targetCustomer = await this.customerRepository.findOneBy({ id: customer.id });
    const isThereAnyRequest = orderedMenus.some(menu => menu.request && menu.request.length !== 0);

    let isPointUsed = false;

    for(const orderedMenu of orderedMenus) {
      const newOrder = new Order();
      const currentMenu = await this.menuRepository.findOneBy({ id: orderedMenu.menu.id });

      // 메뉴가 품절이 된 경우
      if (currentMenu.soldOut === 1) {
        throw new BadRequestException();
      } else {
        newOrder.price = orderedMenu.menu.menuCategory.price;
        newOrder.path = null;
        newOrder.customer = customer.id;
        newOrder.menu = orderedMenu.menu.id;
        newOrder.request = orderedMenu.request;
        const orderMade = await this.orderRepository.save(newOrder);

        // 1. 적립금 '사용' 로직 (첫 번째 메뉴 주문 건에만 묶어서 1회만 실행)
        if (point && point > 0 && !isPointUsed) {
          const pointHistory = new PointHistory();
          pointHistory.customerId = targetCustomer.id;
          pointHistory.amount = -(point * 10);
          pointHistory.orderId = orderMade.id; 
          pointHistory.description = '주문 적립금 사용';
          pointHistory.pathType = PointEnum.USE;
          await this.pointHistoryRepository.save(pointHistory);

          targetCustomer.pointBalance -= (point * 10); // 잔액 메모리에서 차감
          isPointUsed = true; // 이후 루프에서는 실행되지 않도록 잠금!

          orderMade.price -= (point * 1000); // 주문 금액에서 적립금 차감 (1포인트당 1000원)
          await this.orderRepository.save(orderMade); // 변경된 주문 금액 저장

          // 고객 신용 테이블에 적립금 사용 내역 기록
          this.customerCreditRepository.insert({
            orderCode: orderMade.id,
            customer: targetCustomer.id,
            creditDiff: point * 1000,
            memo: '적립금 사용',
          });
        }

        // 2. 메뉴 '적립' 로직 (이건 메뉴마다 매번 쌓이는 게 맞음)
        const menuPoint = new PointHistory();
        menuPoint.customerId = targetCustomer.id;
        menuPoint.amount = targetCustomer.rewardPerMenu;
        menuPoint.orderId = orderMade.id;
        menuPoint.description = '주문 메뉴 적립금';
        menuPoint.pathType = PointEnum.MENU;
        await this.pointHistoryRepository.save(menuPoint);

        targetCustomer.pointBalance += targetCustomer.rewardPerMenu; // 잔액 메모리에서 더하기
      }
    }

    targetCustomer.recentOrder = new Date();
    await this.customerRepository.save(targetCustomer);

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
}
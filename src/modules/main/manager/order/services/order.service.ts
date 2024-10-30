import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@src/entities/order-status.entity";
import { Repository } from "typeorm";
import { Order } from "@src/entities/order.entity";
import { OrderSql } from "@src/modules/main/manager/order/sql/order.sql";
import { StatusEnum } from "@src/types/enum/StatusEnum";
import { GetOrderResponseDto } from "@src/modules/main/manager/order/dto/response/get-order-response.dto";
import { OrderStatusRaw } from "@src/types/models/OrderStatusRaw";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { OrderCategory } from "@src/entities/order-category.entity";
import { Menu } from "@src/entities/menu.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { OrderGateway } from "@src/modules/socket/order.gateway";
import { Pending } from "@src/types/models/Pending";
import { getOrderAvailableTimes } from "@src/utils/date";
import { OrderHistory } from "@src/types/models/OrderHistory";
import { User } from "@src/entities/user.entity";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";
import { Customer } from "@src/entities/customer.entity";

@Injectable()
export class OrderService {

  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepository: Repository<OrderStatus>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderCategory)
    private readonly orderCategoryRepository: Repository<OrderCategory>,

    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    private readonly orderGateway: OrderGateway,

    private readonly fcmService: FirebaseService,
  ) {}

  async pendingStatusForManager() {
    const [firstDate, lastDate] = getOrderAvailableTimes();

    const pending: Pending[] = await this.orderStatusRepository.query(
      OrderSql.getRemainingPendingReceipt,
      [
        firstDate, lastDate,
        StatusEnum.PendingReceipt, StatusEnum.WaitingForDelivery, StatusEnum.InPickingUp,
      ]
    );

    const pendingReceipt = pending.some(p => p.status === StatusEnum.PendingReceipt);
    const waitingForDelivery = pending.some(p => p.status === StatusEnum.WaitingForDelivery);
    const inPickingUp = pending.some(p => p.status === StatusEnum.InPickingUp);

    return { pendingReceipt, waitingForDelivery, inPickingUp };
  }

  async stopAlarmIfNoPending() {
    const [start, end] = getOrderAvailableTimes();

    const pendingReceipts: { status: number }[] = await this.orderStatusRepository
      .createQueryBuilder()
      .select('MAX(status)', 'status')
      .where('time >= :start AND time <= :end', { start, end })
      .groupBy('order_code')
      .getRawMany();

    return pendingReceipts.filter(p => p.status === StatusEnum.PendingReceipt).length === 0;
  }

  async getOrders(
    column: keyof OrderStatusRaw,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string,
    user: User,
    isRemaining: boolean
  ): Promise<GetOrderResponseDto> {
    const like = `%${query}%`;
    const likes = new Array(5).fill(like);

    const orderingMode: number | null = isRemaining ? null : 1;
    const remainingMode: number | null = isRemaining ? 1: null;

    const [firstTime, lastTime] = getOrderAvailableTimes();

    let orderBy: string;
    if (order === '') {
      orderBy = 'ORDER BY t.time DESC'
    } else {
      orderBy = `ORDER BY ${column} ${order}, id ${order}`;
    }

    const data: OrderStatusRaw[] = await this
      .orderStatusRepository
      .query(
        OrderSql.getOrderStatus.replace('^', orderBy),
        [
          ...likes,
          StatusEnum.PendingReceipt, StatusEnum.PickupComplete,
          orderingMode, firstTime, lastTime,
          remainingMode, StatusEnum.InPickingUp,
          countSkip(page)
        ]
      );

    let { count } = (await this
      .orderStatusRepository
      .query(
        OrderSql.getOrderStatusCount,
        [
          ...likes,
          StatusEnum.PendingReceipt, StatusEnum.PickupComplete,
          orderingMode, firstTime, lastTime,
          remainingMode, StatusEnum.AwaitingPickup, StatusEnum.InPickingUp,
        ]
      ))[0];

    count = parseInt(count);

    const { limit, name } = this.getModificationLimitAndItsName(user);

    return {
      data,
      currentPage: page,
      totalPage: countToTotalPage(count),
      count,
      limit,
      name
    }
  }

  async getOrderCategories() {
    return this.orderCategoryRepository.find();
  }

  async getOrderHistory(orderCode: number): Promise<OrderHistory[]> {
    return this
      .orderStatusRepository
      .query(OrderSql.getOrderHistory, [orderCode, orderCode]);
  }

  async createNewOrder(menu: Menu, customer: JwtCustomer, request: string, user: User) {
    const newOrder = new Order();
    const customPrices = await this.customerPriceRepository.findBy({ customer: customer.id });
    const targetCustomer = await this.customerRepository.findOneBy({ id: customer.id });

    if (menu.id === 0) {
      newOrder.price = 0;
    } else {
      const customPrice = customPrices.find(price => price.category === menu.category);

      if(customPrice) {
        newOrder.price = customPrice.price;
      } else {
        newOrder.price = menu.menuCategory.price;
      }
    }

    newOrder.path = user.id;
    newOrder.customer = customer.id;
    newOrder.menu = menu.id;
    newOrder.request = request;
    await this.orderRepository.save(newOrder);

    targetCustomer.recentOrder = new Date();
    await this.customerRepository.save(targetCustomer);

    this.orderGateway.refreshClient();
    this.orderGateway.refresh();
    this.orderGateway.newOrder();
    await this.fcmService.newOrder()
  }

  private getModificationLimitAndItsName(user: User) {
    switch(user.permission) {
      case PermissionEnum.Cook:
        return { limit: StatusEnum.WaitingForDelivery, name: '조리완료' };

      case PermissionEnum.Rider:
      case PermissionEnum.Manager:
        return { limit: StatusEnum.PickupComplete, name: '요청완료' };

      default:
        return { limit: 1, name: '' };
    }
  }
}
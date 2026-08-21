import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { DataSource, Not, Repository } from "typeorm";
import { PointEnum } from "@src/types/enum/PointEnum";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { countToTotalPage } from "@src/utils/data";
import { withSearchPattern } from "@src/utils/hangul";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { CustomerSql } from "@src/modules/main/manager/customer/sql/CustomerSql";
import { CustomerRaw } from "@src/types/models/CustomerRaw";
import * as XLSX from "xlsx-js-style";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { GroupPrice } from "@src/entities/customer/group-price.entity";
import { UpdateGroupPriceDto } from "@src/modules/main/manager/customer/dto/update-group-price.dto";
import { PointHistory } from "@src/entities/point-history.entity";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerCategory)
    private readonly customerCategoryRepository: Repository<CustomerCategory>,
    @InjectRepository(DiscountGroup)
    private readonly discountGroupRepository: Repository<DiscountGroup>,
    @InjectRepository(GroupPrice)
    private readonly groupPriceRepository: Repository<GroupPrice>,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepository: Repository<PointHistory>,
    private readonly datasource: DataSource,
  ) {}

  async getCustomer(
    column: keyof Customer,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string
  ): Promise<GetCustomerResponseDto> {
    // 초성이 섞인 검색어는 LIKE 대신 음절 범위 정규식(REGEXP)으로 찾는다
    const [countSql, countPattern] = withSearchPattern(CustomerSql.getCustomerCount, query);
    const [customerSql, customerPattern] = withSearchPattern(CustomerSql.getCustomer, query);

    let orderBy: string;
    if (order !== '') {
      orderBy = `ORDER BY ${column} ${order}, id ${order}`;
    } else {
      orderBy = `ORDER BY recent_order DESC, id`;
    }

    const { count } = (await this.customerRepository.query(
      countSql,
      new Array(3).fill(countPattern)
    ))[0];

    const customers: CustomerRaw[] = await this.customerRepository.query(
      customerSql.replace('^', orderBy),
      new Array(4).fill(customerPattern)
    );

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      count,
      data: customers,
    }
  }

  async getAll() {
    return this.customerRepository.find({
      where: {
        withdrawn: Not(1),
      },
      order: {
        recentOrder: 'desc'
      }
    });
  }

  async getCategories() { return this.customerCategoryRepository.find(); }

  async createCustomer(customer: Customer) {
    const newCustomer = new Customer();
    newCustomer.name = customer.name;
    newCustomer.memo = customer.memo;
    newCustomer.floor = customer.floor
    newCustomer.address = customer.address;

    await this.customerRepository.save(newCustomer);
  }

  async createCustomerFromExcel(excel: Express.Multer.File) {
    const workbook = XLSX.read(excel.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    for (const row of data) {
      const customerName = row['고객명'];
      const address = row['주소'];
      const floor = row['층수'];
      const memo = row['그릇 찾는곳/주의사항'];
      const category = ((typeof row['카테고리'] === 'string') ? parseInt(row['카테고리']) : row['카테고리']) + 2;

      if (customerName === undefined || customerName === null) {
        continue;
      }

      if (!isNaN(category)) {
        const newCustomer = new Customer();
        newCustomer.name = customerName;
        newCustomer.address = address;
        newCustomer.floor = floor;
        newCustomer.memo = memo;
        newCustomer.category = category;

        await this.customerRepository.save(newCustomer);
      }
    }
  }

  async updateCustomer(customer: Customer) {
    const updatedCustomer = await this.customerRepository.findOneBy({ id: customer.id });
    customer.discountGroupId = parseInt(customer['discount_group_id'].toString());
    
    if (updatedCustomer) {
      updatedCustomer.name = customer.name;
      updatedCustomer.address = customer.address;
      updatedCustomer.memo = customer.memo;
      updatedCustomer.category = customer.category;
      updatedCustomer.floor = customer.floor;
      updatedCustomer.tel = customer.tel;
      updatedCustomer.discountGroupId = customer.discountGroupId === -1 ? null : customer.discountGroupId;
      updatedCustomer.rewardPerBowl = customer.rewardPerBowl;
      updatedCustomer.rewardPerMenu = customer.rewardPerMenu;
      updatedCustomer.isSoldOut = customer['is_sold_out'];
      // 적립금 잔액은 감사 이력이 남는 adjustPoint로만 변경 가능
      await this.customerRepository.save(updatedCustomer);
    }
  }

  async deleteCustomer(id: number) {
    const foundCustomer = await this.customerRepository.findOneBy({ id });
    foundCustomer.withdrawn = 1;
    await this.customerRepository.save(foundCustomer);
  }

  /**
   * 그룹별 메뉴카테고리 가격 조회. 화면 입력 단위(천원)에 맞춰 내려줍니다.
   */
  async getGroupPrice(groupId: number) {
    return (await this.groupPriceRepository.find({
      where: { groupId },
      order: { category: 'ASC' }
    })).map(groupPrice => ({
      ...groupPrice,
      price: groupPrice.price / 1000,
    }));
  }

  /**
   * 그룹별 메뉴카테고리 가격 저장. 값이 비어 있으면 해당 행을 지워 전역 가격으로 되돌립니다.
   */
  async updateGroupPrice(body: UpdateGroupPriceDto) {
    const { data, groupId } = body;
    const groupPrices = await this.groupPriceRepository.findBy({ groupId });

    for (const priceData of data) {
      const category = priceData.id, price = parseInt(priceData.price) * 1000;
      const currentPrice = groupPrices.find(groupPrice => groupPrice.category === category);

      if (!isNaN(price)) {
        if (currentPrice) {
          currentPrice.price = price;
          await this.groupPriceRepository.save(currentPrice);
        } else {
          const newGroupPrice = new GroupPrice();
          newGroupPrice.groupId = groupId;
          newGroupPrice.category = category;
          newGroupPrice.price = price;
          await this.groupPriceRepository.save(newGroupPrice);
        }
      } else {
        await this.groupPriceRepository.delete({ groupId, category });
      }
    }
  }

  async getDiscountGroups() {
    return (await this.discountGroupRepository.find()).map(p => ({...p, modified: false, deleted: false}));
  }

  async modifyDiscountGroups(modified: any[], added: any[]) {
    const d = modified.filter(p => p.deleted);
    const m = modified.filter(p => p.modified);

    for (const item of d) {
      const [, cnt] = await this.customerRepository.findAndCount({
        where: {
          discountGroupId: item.id
        }
      });

      if (cnt === 0) {
        await this.discountGroupRepository.delete({ id: item.id });
      }
    }

    for (const item of m) {
      const modified = new DiscountGroup();
      modified.id = item.id;
      modified.name = item.name;
      modified.discountType = item.discountType;
      modified.discountValue = item.discountValue;
      modified.description = item.description;
      modified.rewardPerMenu = toNullableNumber(item.rewardPerMenu);
      modified.rewardPerBowl = toNullableNumber(item.rewardPerBowl);
      await this.discountGroupRepository.save(modified);
    }

    for (const item of added) {
      const newGroup = new DiscountGroup();
      newGroup.name = item.name;
      newGroup.discountType = item.discountType;
      newGroup.discountValue = item.discountValue;
      newGroup.description = item.description;
      newGroup.rewardPerMenu = toNullableNumber(item.rewardPerMenu);
      newGroup.rewardPerBowl = toNullableNumber(item.rewardPerBowl);
      await this.discountGroupRepository.save(newGroup);
    }
  }

  async setAllGroup(groupId: number) {
    await this.customerRepository.update({}, { discountGroupId: groupId === -1 ? null : groupId });
  }

  /**
   * 고객의 적립금 내역을 최신순으로 조회합니다.
   * isCanceled=1인 항목은 프론트에서 고동색 '취소됨'으로 표기됩니다.
   */
  async getPointHistory(customerId: number): Promise<PointHistory[]> {
    return this.pointHistoryRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 관리자의 적립금 수동 지급/차감. 항상 이력이 남습니다.
   *
   * @param customerId 대상 고객 id
   * @param mode 0: 지급, 1: 차감
   * @param amount 백원 단위 적립금 (양의 정수)
   * @param memo 조정 사유
   */
  async adjustPoint(customerId: number, mode: number, amount: number, memo: string) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('올바른 적립금 금액을 입력해주세요');
    }

    if (mode !== 0 && mode !== 1) {
      throw new BadRequestException();
    }

    const diff = mode === 0 ? amount : -amount;

    await this.datasource.transaction(async (em) => {
      const targetCustomer = await em.getRepository(Customer).findOneBy({ id: customerId });
      if (!targetCustomer) {
        throw new BadRequestException('존재하지 않는 고객입니다');
      }

      // 차감 시 잔액이 음수가 되지 않도록 조건부 원자 갱신
      const result = await em.getRepository(Customer).createQueryBuilder()
        .update()
        .set({ pointBalance: () => 'point_balance + :diff' })
        .where('id = :id AND point_balance + :diff >= 0', { id: customerId, diff })
        .execute();

      if (result.affected === 0) {
        throw new BadRequestException('적립금 잔액이 부족합니다');
      }

      await em.getRepository(PointHistory).insert({
        customerId,
        orderId: null,
        amount: diff,
        pathType: mode === 0 ? PointEnum.ADMIN_ADD : PointEnum.ADMIN_REMOVE,
        description: memo || '관리자 적립금 조정',
      });
    });
  }
}

/** 빈 문자열·null·NaN은 '미설정'(null)으로 저장한다 */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { GroupPrice } from "@src/entities/customer/group-price.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";
import { PriceContext, PricedMenu, resolveMenuPrice, resolveReward } from "@src/utils/price";

/** 가격·적립을 해석할 때 필요한 고객 정보의 최소 형태 (JWT 고객·엔티티 모두 허용) */
export interface CustomerRef {
  id: number;
  discountGroupId?: number | null;
  rewardPerMenu?: number | null;
  rewardPerBowl?: number | null;
}

/**
 * 그룹 → 전역 순으로 설정을 해석해주는 공용 서비스.
 *
 * 가격·적립 로직이 client/manager 여러 서비스에 복제돼 있던 것을 여기로 모았다.
 * 가격은 그룹 단위로만 정하며(고객별 단가는 폐지), 적립만 고객 개별 값이 그룹을 이긴다.
 */
@Injectable()
export class CustomerSettingsService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(GroupPrice)
    private readonly groupPriceRepository: Repository<GroupPrice>,
    @InjectRepository(DiscountGroup)
    private readonly discountGroupRepository: Repository<DiscountGroup>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  /**
   * 메뉴 가격 계산에 필요한 값을 한 번에 읽어옵니다.
   *
   * @param customer 고객 (JWT 정보만 있어도 되며, 그룹 id가 없으면 DB에서 채운다)
   */
  async loadPriceContext(customer: CustomerRef): Promise<PriceContext> {
    const groupId = await this.resolveGroupId(customer);

    const [groupPriceRows, group, webDiscountSetting] = await Promise.all([
      groupId ? this.groupPriceRepository.findBy({ groupId }) : Promise.resolve([]),
      groupId ? this.discountGroupRepository.findOneBy({ id: groupId }) : Promise.resolve(null),
      this.settingsRepository.findOneBy({ big: 5, sml: 1 }),
    ]);

    return {
      groupPrices: toPriceMap(groupPriceRows),
      discountType: group?.discountType ?? null,
      discountValue: group?.discountValue ?? 0,
      webDiscount: webDiscountSetting?.value ?? 0,
    };
  }

  /**
   * 할인을 뺀 '기준가'만 해석합니다. (그룹 > 전역)
   *
   * 관리자 직접주문처럼 원래 할인그룹·웹할인을 적용하지 않던 경로에서 씁니다.
   */
  async resolveBasePrice(customer: CustomerRef, menu: PricedMenu): Promise<number> {
    const context = await this.loadPriceContext(customer);

    return resolveMenuPrice(menu, {
      ...context,
      discountType: null,
      discountValue: 0,
      webDiscount: 0,
    });
  }

  /**
   * 적립액(백원)을 해석합니다. 고객 값이 0(미설정)이면 그룹 값을 씁니다.
   */
  async resolveRewards(customer: CustomerRef): Promise<{ perMenu: number, perBowl: number }> {
    const target = await this.loadCustomer(customer);
    const group = target.discountGroupId
      ? await this.discountGroupRepository.findOneBy({ id: target.discountGroupId })
      : null;

    return {
      perMenu: resolveReward(target.rewardPerMenu, group?.rewardPerMenu ?? null),
      perBowl: resolveReward(target.rewardPerBowl, group?.rewardPerBowl ?? null),
    };
  }

  /** 고객이 속한 그룹 id. 없으면 null */
  private async resolveGroupId(customer: CustomerRef): Promise<number | null> {
    return (await this.loadCustomer(customer)).discountGroupId ?? null;
  }

  /**
   * 그룹·적립 값은 **항상 DB에서 읽는다**.
   *
   * 로그인 시 발급하는 JWT에 고객 행이 통째로 들어가므로(auth.service.clientSignIn),
   * 넘어온 객체의 그룹·적립 값은 관리자가 바꾼 뒤에도 재로그인 전까지 낡은 값이다.
   */
  private async loadCustomer(customer: CustomerRef): Promise<CustomerRef> {
    return await this.customerRepository.findOneBy({ id: customer.id }) ?? customer;
  }
}

function toPriceMap(rows: { category: number, price: number }[]): Record<number, number> {
  const map: Record<number, number> = {};
  rows.forEach(row => { map[row.category] = row.price; });
  return map;
}

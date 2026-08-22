import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { GroupPrice } from "@src/entities/customer/group-price.entity";
import { GroupMenuSoldOut } from "@src/entities/menu/group-menu-sold-out.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { GLOBAL_GROUP_ID, Settings } from "@src/entities/settings.entity";
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
    @InjectRepository(GroupMenuSoldOut)
    private readonly groupSoldOutRepository: Repository<GroupMenuSoldOut>,
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
      this.getSetting(5, 1, groupId),
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

  /**
   * 고객이 속한 그룹의 메뉴 품절 상태를 읽습니다. (menu.id → 0|1)
   *
   * 행이 없는 메뉴는 전역 menu.sold_out 을 따르므로 맵에도 담기지 않습니다.
   */
  async loadSoldOutMap(customer: CustomerRef): Promise<Record<number, number>> {
    const groupId = await this.resolveGroupId(customer);

    if (!groupId) {
      return {};
    }

    const rows = await this.groupSoldOutRepository.findBy({ groupId });
    const map: Record<number, number> = {};
    rows.forEach(row => { map[row.menu] = row.soldOut; });

    return map;
  }

  /** 그룹을 지울 때 품절 행도 함께 지웁니다 */
  async deleteGroupSoldOut(groupId: number): Promise<void> {
    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      return;
    }

    await this.groupSoldOutRepository.delete({ groupId });
  }

  /**
   * 설정 한 건을 그룹 → 전역 순으로 읽습니다.
   *
   * 그룹 행이 없으면 전역(group_id = 0) 행을 돌려주므로,
   * 그룹을 지정하지 않은 고객은 지금까지와 완전히 동일한 값을 받습니다.
   */
  async getSetting(big: number, sml: number, groupId?: number | null): Promise<Settings | null> {
    if (groupId) {
      const groupSetting = await this.settingsRepository.findOneBy({ big, sml, groupId });

      if (groupSetting) {
        return groupSetting;
      }
    }

    return this.settingsRepository.findOneBy({ big, sml, groupId: GLOBAL_GROUP_ID });
  }

  /**
   * 요일별 설정처럼 묶음으로 쓰는 설정을 그룹 → 전역 순으로 읽습니다.
   *
   * 그룹 행이 **하나라도** 있으면 그룹 세트를, 하나도 없으면 전역 세트를 돌려줍니다.
   * (일부 요일만 그룹 행이 있는 어중간한 상태를 만들지 않기 위해
   *  편집 시 ensureGroupRows 로 7행을 한꺼번에 만든다)
   */
  async getSettings(big: number, groupId?: number | null): Promise<Settings[]> {
    if (groupId) {
      const groupSettings = await this.settingsRepository.findBy({ big, groupId });

      if (groupSettings.length > 0) {
        return groupSettings;
      }
    }

    return this.settingsRepository.findBy({ big, groupId: GLOBAL_GROUP_ID });
  }

  /**
   * 고객이 속한 그룹의 설정을 읽습니다. (고객 → 그룹 → 전역)
   */
  async getSettingForCustomer(big: number, sml: number, customer: CustomerRef): Promise<Settings | null> {
    return this.getSetting(big, sml, await this.resolveGroupId(customer));
  }

  /** 위와 같되 묶음 조회 */
  async getSettingsForCustomer(big: number, customer: CustomerRef): Promise<Settings[]> {
    return this.getSettings(big, await this.resolveGroupId(customer));
  }

  /**
   * 편집을 위해 그룹 전용 행을 준비합니다. 없으면 **전역 값을 복사해** 만듭니다.
   *
   * 관리자가 그룹을 골라 저장하는 순간 그룹 전용 행이 생기고,
   * 그 전까지는 전역 값을 그대로 따르는 것이 이 설계의 규칙입니다.
   * (settings.service 의 ensureDisposalRows 와 같은 패턴)
   */
  async ensureGroupRows(big: number, groupId: number): Promise<Settings[]> {
    const globalRows = await this.settingsRepository.findBy({ big, groupId: GLOBAL_GROUP_ID });

    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      return globalRows;
    }

    const groupRows = await this.settingsRepository.findBy({ big, groupId });

    for (const globalRow of globalRows) {
      if (groupRows.some(row => row.sml === globalRow.sml)) {
        continue;
      }

      const created = new Settings();
      created.big = big;
      created.sml = globalRow.sml;
      created.name = globalRow.name;
      created.value = globalRow.value;
      created.stringValue = globalRow.stringValue;
      created.groupId = groupId;
      groupRows.push(await this.settingsRepository.save(created));
    }

    return groupRows.sort((a, b) => a.sml - b.sml);
  }

  /** 그룹을 지울 때 그 그룹의 설정 행도 함께 지웁니다 (FK가 없어 고아 행이 남는다) */
  async deleteGroupSettings(groupId: number): Promise<void> {
    if (!groupId || groupId === GLOBAL_GROUP_ID) {
      return;
    }

    await this.settingsRepository.delete({ groupId });
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

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { GroupPrice } from "@src/entities/customer/group-price.entity";
import { DiscountGroup } from "@src/entities/customer/discount-group.entity";
import { Settings } from "@src/entities/settings.entity";
import { CustomerSettingsService } from "@src/modules/misc/customer-settings/customer-settings.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, GroupPrice, DiscountGroup, Settings]),
  ],
  providers: [CustomerSettingsService],
  exports: [CustomerSettingsService],
})
export class CustomerSettingsModule {}

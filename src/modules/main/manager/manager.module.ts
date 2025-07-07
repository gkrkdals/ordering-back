import { Module } from "@nestjs/common";
import { MenuModule } from "@src/modules/main/manager/menu/menu.module";
import { OrderModule } from "@src/modules/main/manager/order/order.module";
import { CustomerModule } from "@src/modules/main/manager/customer/customer.module";
import { SettingsModule } from "@src/modules/main/manager/settings/settings.module";

@Module({
  imports: [
    MenuModule,
    OrderModule,
    CustomerModule,
    SettingsModule,
  ]
})
export class ManagerModule {}
import { Module } from "@nestjs/common";
import { MenuModule } from "@src/modules/main/client/menu/menu.module";
import { OrderModule } from "@src/modules/main/client/order/order.module";
import { SettingsModule } from "@src/modules/main/client/settings/settings.module";

@Module({
  imports: [
    MenuModule,
    OrderModule,
    SettingsModule
  ]
})
export class ClientModule {}
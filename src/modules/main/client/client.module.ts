import { Module } from "@nestjs/common";
import { MenuModule } from "@src/modules/main/client/menu/menu.module";
import { OrderModule } from "@src/modules/main/client/order/order.module";

@Module({
  imports: [
    MenuModule,
    OrderModule,
  ]
})
export class ClientModule {}
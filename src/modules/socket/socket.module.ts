import { Module } from "@nestjs/common";
import { OrderGateway } from "@src/modules/socket/order.gateway";

@Module({
  providers: [OrderGateway],
  exports: [OrderGateway],
})
export class SocketModule {}
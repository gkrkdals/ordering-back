import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ormConfig } from "./config/mysql";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientModule } from "@src/modules/main/client/client.module";
import { ManagerModule } from "@src/modules/main/manager/manager.module";
import { OrderGateway } from "@src/socket/order.gateway";

@Module({
  imports: [
    TypeOrmModule.forRootAsync(ormConfig), 
    AuthModule,
    ClientModule,
    ManagerModule,
  ],
  providers: [
    OrderGateway,
  ]
})
export class ApiModule {}
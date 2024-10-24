import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ormConfig } from "./config/mysql";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientModule } from "@src/modules/main/client/client.module";
import { ManagerModule } from "@src/modules/main/manager/manager.module";
import { SocketModule } from "@src/modules/socket/socket.module";

@Module({
  imports: [
    TypeOrmModule.forRootAsync(ormConfig), 
    AuthModule,
    ClientModule,
    ManagerModule,
    SocketModule,
  ],
})
export class ApiModule {}
import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { jwtConfig } from "@src/config/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@src/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { AccountService } from "@src/modules/auth/services/account.service";
import { FirebaseModule } from "@src/modules/firebase/firebase.module";

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync(jwtConfig),
    TypeOrmModule.forFeature([User]),
    FirebaseModule,
  ],
  providers: [AuthService, AccountService, ConfigService],
  controllers: [AuthController],
})
export class AuthModule {}
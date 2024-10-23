import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { jwtConfig } from "@src/config/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@src/entities/user.entity";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync(jwtConfig),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AuthService, ConfigService],
  controllers: [AuthController],
})
export class AuthModule {}
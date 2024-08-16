import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { jwtConfig } from "@src/config/jwt";

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync(jwtConfig),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
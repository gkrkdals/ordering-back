import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { jwtConfig } from "@src/config/jwt";

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync(jwtConfig),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
import { Module } from "@nestjs/common";
import { SettingsService } from "@src/modules/main/client/settings/settings.service";
import { SettingsController } from "@src/modules/main/client/settings/settings.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Settings } from "@src/entities/settings.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Settings])
  ],
  controllers: [SettingsController],
  providers: [SettingsService, JwtService]
})
export class SettingsModule {}
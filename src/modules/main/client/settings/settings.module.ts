import { Module } from "@nestjs/common";
import { SettingsService } from "@src/modules/main/client/settings/settings.service";
import { SettingsController } from "@src/modules/main/client/settings/settings.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Settings } from "@src/entities/settings.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Settings])
  ],
  controllers: [SettingsController],
  providers: [SettingsService]
})
export class SettingsModule {}
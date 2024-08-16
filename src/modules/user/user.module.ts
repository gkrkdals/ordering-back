import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { UserService } from "@src/modules/user/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
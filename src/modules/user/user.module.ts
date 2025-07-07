import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { UserService } from "@src/modules/user/user.service";
import { User } from "@src/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      User,
    ])
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
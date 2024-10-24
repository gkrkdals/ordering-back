import { Module } from "@nestjs/common";
import { FirebaseService } from "@src/modules/firebase/firebase.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@src/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User
    ])
  ],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
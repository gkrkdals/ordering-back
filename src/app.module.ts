import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuModule } from "@src/modules/menu/menu.module";
import { OrderModule } from "@src/modules/order/order.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'dltkrkfody1',
      database: 'ordering',
      autoLoadEntities: true,
    }),
    MenuModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

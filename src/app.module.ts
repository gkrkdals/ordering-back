import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api.module';
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from 'path';
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../', 'static'),
      exclude: ['/api*']
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ApiModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
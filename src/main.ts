import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as dotenv from "dotenv";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    origin: [ process.env.ORIGIN, 'https://localhost' ],
  });
  app.use(cookieParser());
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT);
}
bootstrap();

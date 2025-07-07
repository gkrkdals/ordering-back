import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    origin: [ process.env.ORIGIN, 'https://localhost' ],
  });
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.host.includes('www')) {
      return res.redirect(301, process.env.ORIGIN + req.originalUrl);
    }
    next();
  })

  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT);
}
bootstrap();

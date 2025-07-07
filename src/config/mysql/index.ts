import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from "@nestjs/typeorm";

export const ormConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const config: TypeOrmModuleOptions = {
      type: 'mysql',
      host: configService.get('DATABASE_HOST'),
      port: parseInt(configService.get('DATABASE_PORT')),
      username: configService.get('DATABASE_USERNAME'),
      password: configService.get<string>('DATABASE_PASSWORD'),
      database: configService.get('DATABASE'),
      autoLoadEntities: true,
    }

    return config;
  }
}

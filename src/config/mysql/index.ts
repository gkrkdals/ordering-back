import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from "@nestjs/typeorm";

export const ormConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const config: TypeOrmModuleOptions = {
      type: 'mysql',
      connectorPackage: 'mysql2',
      host: configService.get('DATABASE_HOST'),
      port: parseInt(configService.get('DATABASE_PORT')),
      username: configService.get('DATABASE_USERNAME'),
      password: configService.get<string>('DATABASE_PASSWORD'),
      database: configService.get('DATABASE'),
      autoLoadEntities: true,

      // mysql2 의 connectionLimit 으로 매핑된다.
      // 운영 서버가 2코어라 풀을 키우면 처리량이 늘지 않고 CPU 경합만 커지므로
      // 기본값(10)에서 소폭만 올린다. MySQL 쪽 max_connections 는 151이라 여유가 있다.
      poolSize: 15,

      // 1초를 넘긴 쿼리를 실제 SQL과 함께 경고로 남긴다. (중단시키지는 않는다)
      maxQueryExecutionTime: 1000,
      logging: ['warn', 'error'],

      extra: {
        // TypeORM 에 대응 옵션이 없는 mysql2 전용 풀 설정은 extra 로만 넣을 수 있다.
        // extra 는 드라이버 설정에 마지막으로 병합되므로 여기에 connectionLimit 을 쓰면
        // 위 poolSize 가 덮여버린다. 쓰지 말 것.
        waitForConnections: true,
        queueLimit: 0,
        idleTimeout: 60000,
      },
    }

    return config;
  }
}

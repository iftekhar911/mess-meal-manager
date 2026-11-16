import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MessEntity } from './entities/mess.entity';
import { MembershipEntity } from './entities/membership.entity';

/**
 * Database module configuring PostgreSQL with TypeORM.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get<string>('NODE_ENV') === 'test';
        if (isTest) {
          return {
            type: 'better-sqlite3' as const,
            database: ':memory:',
            dropSchema: true,
            entities: [UserEntity, RefreshTokenEntity, MessEntity, MembershipEntity],
            synchronize: true,
            logging: false
          };
        }
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'mess_meal_manager'),
          entities: [UserEntity, RefreshTokenEntity, MessEntity, MembershipEntity],
          synchronize: false,
          logging: config.get<string>('NODE_ENV') === 'development'
        };
      }
    }),
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, MessEntity, MembershipEntity])
  ],
  exports: [TypeOrmModule]
})
export class DatabaseModule {}

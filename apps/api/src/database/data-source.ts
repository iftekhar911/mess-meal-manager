import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MessEntity } from './entities/mess.entity';
import { MembershipEntity } from './entities/membership.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mess_meal_manager',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [UserEntity, RefreshTokenEntity, MessEntity, MembershipEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}']
});

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { DailyMenuEntity } from '../../database/entities/daily-menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyMenuEntity])],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService]
})
export class MenusModule {}

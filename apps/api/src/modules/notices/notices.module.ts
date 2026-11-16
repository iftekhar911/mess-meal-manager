import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticesService } from './notices.service';
import { NoticesController } from './notices.controller';
import { NoticeEntity } from '../../database/entities/notice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NoticeEntity])],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService]
})
export class NoticesModule {}

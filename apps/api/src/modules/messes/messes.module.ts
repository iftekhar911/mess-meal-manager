import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MessesService } from './messes.service';
import { MessesController } from './messes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MessEntity, MembershipEntity])],
  controllers: [MessesController],
  providers: [MessesService],
  exports: [MessesService]
})
export class MessesModule {}

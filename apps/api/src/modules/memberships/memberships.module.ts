import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MembershipEntity, UserEntity])],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService]
})
export class MembershipsModule {}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { SwapStatus } from '@mess/shared';
import { ShoppingRosterEntity } from './shopping-roster.entity';
import { MembershipEntity } from './membership.entity';

@Entity('swap_requests')
export class SwapRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roster_id', type: 'uuid' })
  @Index()
  rosterId!: string;

  @ManyToOne(() => ShoppingRosterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roster_id' })
  roster!: ShoppingRosterEntity;

  @Column({ name: 'from_membership_id', type: 'uuid' })
  @Index()
  fromMembershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_membership_id' })
  fromMembership!: MembershipEntity;

  @Column({ name: 'to_membership_id', type: 'uuid' })
  @Index()
  toMembershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_membership_id' })
  toMembership!: MembershipEntity;

  @Column({
    type: 'enum',
    enum: SwapStatus,
    default: SwapStatus.PENDING
  })
  status!: SwapStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

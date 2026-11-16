import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index
} from 'typeorm';
import { RosterSource } from '@mess/shared';
import { MessEntity } from './mess.entity';
import { MembershipEntity } from './membership.entity';

@Entity('shopping_roster')
@Unique(['date', 'membershipId'])
export class ShoppingRosterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mess_id', type: 'uuid' })
  @Index()
  messId!: string;

  @ManyToOne(() => MessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mess_id' })
  mess!: MessEntity;

  @Column({ type: 'date' })
  @Index()
  date!: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  @Index()
  membershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipEntity;

  @Column({
    type: 'enum',
    enum: RosterSource,
    default: RosterSource.VOTE
  })
  source!: RosterSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

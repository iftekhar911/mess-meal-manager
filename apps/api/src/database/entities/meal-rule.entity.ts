import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { RuleKind } from '@mess/shared';
import { MembershipEntity } from './membership.entity';

@Entity('meal_rules')
export class MealRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  @Index()
  membershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipEntity;

  @Column({ name: 'from_date', type: 'date' })
  fromDate!: string;

  @Column({ name: 'to_date', type: 'date', nullable: true })
  toDate!: string | null;

  @Column({ type: 'boolean' })
  status!: boolean;

  @Column({
    type: 'enum',
    enum: RuleKind,
    default: RuleKind.RANGE
  })
  kind!: RuleKind;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

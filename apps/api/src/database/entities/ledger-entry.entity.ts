import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { LedgerType } from '@mess/shared';
import { MembershipEntity } from './membership.entity';
import { UserEntity } from './user.entity';

@Entity('ledger_entries')
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  @Index()
  membershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipEntity;

  @Column({
    type: 'enum',
    enum: LedgerType
  })
  type!: LedgerType;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  amount!: string;

  @Column({ type: 'date' })
  @Index()
  date!: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

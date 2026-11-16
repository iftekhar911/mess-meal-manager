import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index
} from 'typeorm';
import { ProteinType } from '@mess/shared';
import { MessEntity } from './mess.entity';
import { MembershipEntity } from './membership.entity';

@Entity('daily_menus')
@Unique(['messId', 'date'])
export class DailyMenuEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mess_id', type: 'uuid' })
  @Index()
  messId!: string;

  @ManyToOne(() => MessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mess_id' })
  mess!: MessEntity;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'shopper_id', type: 'uuid', nullable: true })
  shopperId!: string | null;

  @ManyToOne(() => MembershipEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shopper_id' })
  shopper!: MembershipEntity | null;

  @Column({
    type: 'enum',
    enum: ProteinType,
    default: ProteinType.OTHER
  })
  protein!: ProteinType;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

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
import { SlotType, EggPreference, OverrideSource } from '@mess/shared';
import { MembershipEntity } from './membership.entity';

@Entity('meal_overrides')
@Unique(['membershipId', 'date', 'slot'])
export class MealOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  @Index()
  membershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipEntity;

  @Column({ type: 'date' })
  date!: string;

  @Column({
    type: 'enum',
    enum: SlotType
  })
  slot!: SlotType;

  @Column({ type: 'boolean' })
  status!: boolean;

  @Column({
    name: 'egg_preference',
    type: 'enum',
    enum: EggPreference,
    default: EggPreference.NONE
  })
  eggPreference!: EggPreference;

  @Column({ name: 'guest_count', type: 'int', default: 0 })
  guestCount!: number;

  @Column({
    type: 'enum',
    enum: OverrideSource,
    default: OverrideSource.BOARDER
  })
  source!: OverrideSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

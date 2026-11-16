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
import { MealType, SlotType, EggPreference } from '@mess/shared';
import { MembershipEntity } from './membership.entity';

@Entity('meal_defaults')
export class MealDefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  @Index()
  membershipId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipEntity;

  @Column({
    name: 'meal_type',
    type: 'enum',
    enum: MealType,
    default: MealType.FULL
  })
  mealType!: MealType;

  @Column({
    name: 'half_slot',
    type: 'enum',
    enum: SlotType,
    nullable: true
  })
  halfSlot!: SlotType | null;

  @Column({
    name: 'egg_preference',
    type: 'enum',
    enum: EggPreference,
    default: EggPreference.NONE
  })
  eggPreference!: EggPreference;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

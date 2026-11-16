import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { MembershipEntity } from './membership.entity';

/**
 * Mess (boarding house) entity.
 */
@Entity('messes')
export class MessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'cutoff_time', type: 'time', default: '22:00:00' })
  cutoffTime!: string;

  @Column({ name: 'meal_rate', type: 'numeric', precision: 12, scale: 4, default: '50.0000' })
  mealRate!: string;

  @Column({ name: 'grace_days', type: 'int', default: 3 })
  graceDays!: number;

  @Column({ name: 'warning_days', type: 'int', default: 2 })
  warningDays!: number;

  @Column({ name: 'shoppers_per_day', type: 'int', default: 2 })
  shoppersPerDay!: number;

  @Column({ name: 'shop_times_per_month', type: 'int', default: 2 })
  shopTimesPerMonth!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => MembershipEntity, (membership) => membership.mess)
  memberships!: MembershipEntity[];
}

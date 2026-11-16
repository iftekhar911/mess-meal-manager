import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { MessEntity } from './mess.entity';
import { UserEntity } from './user.entity';

@Entity('month_closes')
@Unique(['messId', 'month'])
export class MonthCloseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mess_id', type: 'uuid' })
  @Index()
  messId!: string;

  @ManyToOne(() => MessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mess_id' })
  mess!: MessEntity;

  @Column({ type: 'varchar', length: 7 })
  @Index()
  month!: string;

  @Column({ name: 'closed_by_id', type: 'uuid' })
  closedById!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy!: UserEntity;

  @Column({ name: 'total_meals', type: 'numeric', precision: 12, scale: 4 })
  totalMeals!: string;

  @Column({ name: 'total_market_cost', type: 'numeric', precision: 12, scale: 4 })
  totalMarketCost!: string;

  @Column({ name: 'actual_meal_rate', type: 'numeric', precision: 12, scale: 4 })
  actualMealRate!: string;

  @Column({ name: 'estimated_meal_rate', type: 'numeric', precision: 12, scale: 4 })
  estimatedMealRate!: string;

  @Column({ name: 'total_fuel_cost', type: 'numeric', precision: 12, scale: 4 })
  totalFuelCost!: string;

  @Column({ name: 'estimated_fuel_cost', type: 'numeric', precision: 12, scale: 4 })
  estimatedFuelCost!: string;

  @Column({ name: 'fuel_diff_reconciliation', type: 'numeric', precision: 12, scale: 4 })
  fuelDiffReconciliation!: string;

  @Column({ name: 'total_cook_bill', type: 'numeric', precision: 12, scale: 4 })
  totalCookBill!: string;

  @Column({ name: 'is_locked', type: 'boolean', default: true })
  isLocked!: boolean;

  @Column({ name: 'closed_at', type: 'timestamptz' })
  closedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

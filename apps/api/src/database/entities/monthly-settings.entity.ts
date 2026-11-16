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
import { MessEntity } from './mess.entity';

@Entity('monthly_settings')
@Unique(['messId', 'month'])
export class MonthlySettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mess_id', type: 'uuid' })
  @Index()
  messId!: string;

  @ManyToOne(() => MessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mess_id' })
  mess!: MessEntity;

  @Column({ type: 'char', length: 7 }) // YYYY-MM
  month!: string;

  @Column({
    name: 'est_fuel_total',
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: '0.0000'
  })
  estFuelTotal!: string;

  @Column({
    name: 'est_meal_rate',
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: '50.0000'
  })
  estMealRate!: string;

  @Column({ name: 'voting_deadline', type: 'timestamptz', nullable: true })
  votingDeadline!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

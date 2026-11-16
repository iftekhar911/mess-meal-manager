import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { MessEntity } from './mess.entity';

@Entity('fuel_expenses')
export class FuelExpenseEntity {
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

  @Column({ type: 'varchar', length: 50 })
  kind!: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  amount!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

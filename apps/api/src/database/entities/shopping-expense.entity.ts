import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { ExpenseStatus } from '@mess/shared';
import { MessEntity } from './mess.entity';
import { MembershipEntity } from './membership.entity';
import { ExpenseItemEntity } from './expense-item.entity';

@Entity('shopping_expenses')
export class ShoppingExpenseEntity {
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

  @Column({ name: 'shopper_id', type: 'uuid' })
  shopperId!: string;

  @ManyToOne(() => MembershipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopper_id' })
  shopper!: MembershipEntity;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  total!: string;

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PENDING
  })
  status!: ExpenseStatus;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ExpenseItemEntity, (item) => item.expense, { cascade: true })
  items!: ExpenseItemEntity[];
}

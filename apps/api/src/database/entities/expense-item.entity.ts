import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ShoppingExpenseEntity } from './shopping-expense.entity';

@Entity('expense_items')
export class ExpenseItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'expense_id', type: 'uuid' })
  @Index()
  expenseId!: string;

  @ManyToOne(() => ShoppingExpenseEntity, (expense) => expense.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense!: ShoppingExpenseEntity;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  quantity!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  price!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

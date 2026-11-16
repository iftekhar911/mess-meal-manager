import { z } from 'zod';
import { MembershipRole, MealType, SlotType, EggPreference, ProteinType } from '../enums';

/**
 * Bangladesh phone number regex supporting standard and Bengali numerals.
 */
export const BANGLADESH_PHONE_REGEX = /^[0-9০-৯+\-\s]{4,20}$/;

/**
 * User registration validation schema.
 */
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(4, 'Please enter a valid phone number').max(20),
  password: z.string().min(4, 'Password must be at least 4 characters').max(128)
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * User login validation schema.
 */
export const LoginSchema = z.object({
  phone: z.string().min(4, 'Please enter a valid phone number').max(20),
  password: z.string().min(1, 'Password is required')
});
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Mess creation validation schema.
 */
export const CreateMessSchema = z.object({
  name: z.string().min(3, 'Mess name must be at least 3 characters').max(100),
  cutoffTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Cutoff time must be HH:mm or HH:mm:ss')
    .default('22:00:00'),
  mealRate: z.number().positive('Estimated meal rate must be positive').default(50.0),
  graceDays: z.number().int().min(0).max(10).default(3),
  warningDays: z.number().int().min(0).max(7).default(2),
  shoppersPerDay: z.number().int().min(1).max(5).default(2),
  shopTimesPerMonth: z.number().int().min(1).max(10).default(2)
});
export type CreateMessInput = z.infer<typeof CreateMessSchema>;

/**
 * Add boarder to mess validation schema.
 */
export const AddBoarderSchema = z.object({
  phone: z.string().regex(BANGLADESH_PHONE_REGEX, 'Please enter a valid Bangladesh phone number'),
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(MembershipRole).default(MembershipRole.BOARDER),
  cookBillAmount: z.number().min(0).default(250.0)
});
export type AddBoarderInput = z.infer<typeof AddBoarderSchema>;

/**
 * Default meal preferences validation schema.
 */
export const SetMealDefaultSchema = z.object({
  mealType: z.nativeEnum(MealType),
  halfSlot: z.nativeEnum(SlotType).nullable().optional(),
  eggPreference: z.nativeEnum(EggPreference).default(EggPreference.NONE)
});
export type SetMealDefaultInput = z.infer<typeof SetMealDefaultSchema>;

/**
 * Continuous toggle meal rule schema.
 */
export const SetMealToggleSchema = z.object({
  status: z.boolean(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
});
export type SetMealToggleInput = z.infer<typeof SetMealToggleSchema>;

/**
 * Date range meal leave rule schema.
 */
export const SetMealRangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD'),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD'),
  status: z.boolean()
});
export type SetMealRangeInput = z.infer<typeof SetMealRangeSchema>;

/**
 * Single-slot override validation schema.
 */
export const SetMealOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  slot: z.nativeEnum(SlotType),
  status: z.boolean(),
  eggPreference: z.nativeEnum(EggPreference).default(EggPreference.NONE),
  guestCount: z.number().int().min(0).max(20).default(0)
});
export type SetMealOverrideInput = z.infer<typeof SetMealOverrideSchema>;

/**
 * Manager force meal exception schema.
 */
export const ManagerForceMealSchema = z.object({
  membershipId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  slot: z.nativeEnum(SlotType),
  status: z.boolean(),
  eggPreference: z.nativeEnum(EggPreference).default(EggPreference.NONE),
  guestCount: z.number().int().min(0).max(20).default(0),
  reason: z.string().min(5, 'A clear reason is required for audit records')
});
export type ManagerForceMealInput = z.infer<typeof ManagerForceMealSchema>;

/**
 * Deposit recording schema.
 */
export const RecordDepositSchema = z.object({
  membershipId: z.string().uuid(),
  amount: z.number().positive('Deposit amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  note: z.string().max(255).optional(),
  restoreAutoOffMeals: z.boolean().default(true)
});
export type RecordDepositInput = z.infer<typeof RecordDepositSchema>;

/**
 * Daily shopper menu entry schema.
 */
export const SetDailyMenuSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  protein: z.nativeEnum(ProteinType),
  note: z.string().max(255).optional()
});
export type SetDailyMenuInput = z.infer<typeof SetDailyMenuSchema>;

/**
 * Expense item input schema.
 */
export const ExpenseItemInputSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(150),
  quantity: z.string().max(50).optional(),
  price: z.number().positive('Price must be positive')
});

/**
 * Record shopping expense schema.
 */
export const RecordShoppingExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  receiptUrl: z.string().url().optional(),
  items: z.array(ExpenseItemInputSchema).min(1, 'At least one item is required')
});
export type RecordShoppingExpenseInput = z.infer<typeof RecordShoppingExpenseSchema>;

/**
 * Notice creation schema.
 */
export const CreateNoticeSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5)
});
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;

import Decimal from 'decimal.js';

export interface SlotCostBreakdown {
  mealDebit: Decimal;
  fuelDebit: Decimal;
  cookDebit: Decimal;
  guestDebit: Decimal;
  totalDebit: Decimal;
}

export interface MonthReconciliationInput {
  actualTotalFuelCost: Decimal.Value;
  totalFuelCollected: Decimal.Value;
  totalActiveSlotsInMess: number;
}

/**
 * Pure domain class for monetary debits and month close adjustments.
 * Enforces decimal.js calculations with numeric(12,4) precision.
 */
export class CostCalculator {
  /**
   * Calculates per slot debits for an active meal slot.
   *
   * @param mealRate - Current estimated or fixed meal rate in BDT.
   * @param estimatedMonthlyFuel - Estimated monthly fuel total in BDT.
   * @param expectedTotalSlots - Total expected slots across all boarders in month.
   * @param monthlyCookBill - Fixed monthly cook bill per boarder in BDT.
   * @param daysInMonth - Number of days in active month.
   * @param guestCount - Number of guests accompanying the boarder for this slot.
   * @returns Detailed slot cost breakdown.
   */
  public static calculateSlotDebit(
    mealRate: Decimal.Value,
    estimatedMonthlyFuel: Decimal.Value,
    expectedTotalSlots: number,
    monthlyCookBill: Decimal.Value,
    daysInMonth: number,
    guestCount = 0
  ): SlotCostBreakdown {
    // Regular meal slot debit = mealRate * 0.5
    const mealDebit = new Decimal(mealRate).times(0.5);

    // Fuel per slot = estimatedMonthlyFuel / expectedTotalSlots
    const fuelDebit =
      expectedTotalSlots > 0
        ? new Decimal(estimatedMonthlyFuel).dividedBy(expectedTotalSlots)
        : new Decimal(0);

    // Cook bill per slot = monthlyCookBill / (daysInMonth * 2)
    const totalSlotsInMonth = daysInMonth * 2;
    const cookDebit =
      totalSlotsInMonth > 0
        ? new Decimal(monthlyCookBill).dividedBy(totalSlotsInMonth)
        : new Decimal(0);

    // Guest meals: meal cost and fuel cost, but NOT cook bill
    const singleGuestDebit = mealDebit.plus(fuelDebit);
    const guestDebit = singleGuestDebit.times(guestCount);

    const totalDebit = mealDebit.plus(fuelDebit).plus(cookDebit).plus(guestDebit);

    return {
      mealDebit,
      fuelDebit,
      cookDebit,
      guestDebit,
      totalDebit
    };
  }

  /**
   * Calculates the extra fuel adjustment per slot if actual fuel cost exceeds collected fuel.
   * Distributed in proportion to active slots eaten.
   *
   * @param input - Reconciliation numbers.
   * @returns Extra debit amount per active slot as a Decimal.
   */
  public static calculateExtraFuelAdjustmentPerSlot(input: MonthReconciliationInput): Decimal {
    const actual = new Decimal(input.actualTotalFuelCost);
    const collected = new Decimal(input.totalFuelCollected);
    const diff = actual.minus(collected);

    if (diff.isNegative() || diff.isZero() || input.totalActiveSlotsInMess <= 0) {
      return new Decimal(0);
    }

    return diff.dividedBy(input.totalActiveSlotsInMess);
  }
}

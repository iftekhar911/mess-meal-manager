import { CostCalculator } from './cost-calculator';

describe('CostCalculator', () => {
  it('should accurately compute worked example from specification', () => {
    // 30 boarders, fuel cost 12,000, 30 days
    // Total slots = 30 * 60 = 1800
    // Fuel per slot = 12000 / 1800 = 6.6667
    // Cook bill 250 -> 250 / 60 = 4.1667 per slot
    const boarders = 30;
    const daysInMonth = 30;
    const totalSlots = boarders * daysInMonth * 2; // 1800
    const monthlyFuel = 12000;
    const cookBill = 250;
    const mealRate = 50;

    const breakdown = CostCalculator.calculateSlotDebit(
      mealRate,
      monthlyFuel,
      totalSlots,
      cookBill,
      daysInMonth
    );

    // Meal: 50 * 0.5 = 25
    expect(breakdown.mealDebit.toNumber()).toBe(25);

    // Fuel per slot: 12000 / 1800 = 6.6666...
    expect(breakdown.fuelDebit.toFixed(2)).toBe('6.67');

    // For 60 slots (full meal for 30 days), boarder fuel total = 60 * (12000 / 1800) = 400
    const fullMonthFuelTotal = breakdown.fuelDebit.times(60);
    expect(fullMonthFuelTotal.toFixed(2)).toBe('400.00');

    // Cook bill per slot: 250 / 60 = 4.1667
    expect(breakdown.cookDebit.toFixed(2)).toBe('4.17');

    // For 60 slots, boarder cook bill total = 250
    const fullMonthCookTotal = breakdown.cookDebit.times(60);
    expect(fullMonthCookTotal.toFixed(2)).toBe('250.00');
  });

  it('should charge guest meals meal cost and fuel cost, but not cook bill', () => {
    const mealRate = 60;
    const monthlyFuel = 9000;
    const totalSlots = 1800; // 5 per slot
    const cookBill = 300; // 5 per slot
    const daysInMonth = 30;

    const breakdown = CostCalculator.calculateSlotDebit(
      mealRate,
      monthlyFuel,
      totalSlots,
      cookBill,
      daysInMonth,
      2 // 2 guests
    );

    // Regular meal slot: meal (30) + fuel (5) + cook (5) = 40
    // Guest debit for 2 guests: (meal 30 + fuel 5) * 2 = 70
    // Cook bill must NOT be included in guest debit
    expect(breakdown.guestDebit.toNumber()).toBe(70);
    expect(breakdown.totalDebit.toNumber()).toBe(110);
  });

  it('should distribute extra fuel cost proportionally at month close', () => {
    const adjustment = CostCalculator.calculateExtraFuelAdjustmentPerSlot({
      actualTotalFuelCost: 14000,
      totalFuelCollected: 12000, // Diff = 2000
      totalActiveSlotsInMess: 1600
    });

    // 2000 / 1600 = 1.25 per active slot
    expect(adjustment.toNumber()).toBe(1.25);
  });

  it('should return 0 extra fuel adjustment when actual cost does not exceed collected', () => {
    const adjustment = CostCalculator.calculateExtraFuelAdjustmentPerSlot({
      actualTotalFuelCost: 11500,
      totalFuelCollected: 12000,
      totalActiveSlotsInMess: 1600
    });

    expect(adjustment.toNumber()).toBe(0);
  });
});

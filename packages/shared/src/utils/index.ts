import Decimal from 'decimal.js';
import { ASIA_DHAKA_TZ, MEAL_UNITS_PER_SLOT } from '../constants';

/**
 * Returns the current date in Asia/Dhaka timezone formatted as YYYY-MM-DD.
 *
 * @param date - Optional reference date (defaults to now).
 * @returns Date string in YYYY-MM-DD format.
 */
export function getDhakaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ASIA_DHAKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Returns the current time in Asia/Dhaka timezone formatted as HH:mm:ss.
 *
 * @param date - Optional reference date (defaults to now).
 * @returns Time string in HH:mm:ss format.
 */
export function getDhakaTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ASIA_DHAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(date);
}

/**
 * Calculates tomorrow date string in Asia/Dhaka timezone.
 *
 * @param currentDateStr - Current YYYY-MM-DD string.
 * @returns Tomorrow YYYY-MM-DD string.
 */
export function getNextDateString(currentDateStr: string): string {
  const [year, month, day] = currentDateStr.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('Invalid date format');
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates monetary slot debit for fuel/gas based on monthly estimate and expected slot count.
 *
 * @param monthlyFuelEstimate - Total estimated fuel cost in BDT.
 * @param expectedSlotsInMonth - Total expected meal slots (boarders * days * 2).
 * @returns Fuel cost per slot as a Decimal instance.
 */
export function calculateFuelCostPerSlot(
  monthlyFuelEstimate: Decimal.Value,
  expectedSlotsInMonth: number
): Decimal {
  if (expectedSlotsInMonth <= 0) {
    return new Decimal(0);
  }
  return new Decimal(monthlyFuelEstimate).dividedBy(expectedSlotsInMonth);
}

/**
 * Calculates monetary slot debit for the cook (khala) bill.
 *
 * @param monthlyCookBill - Fixed cook bill per boarder in BDT.
 * @param daysInMonth - Total days in the active month.
 * @returns Cook bill per slot as a Decimal instance.
 */
export function calculateCookBillPerSlot(
  monthlyCookBill: Decimal.Value,
  daysInMonth: number
): Decimal {
  if (daysInMonth <= 0) {
    return new Decimal(0);
  }
  return new Decimal(monthlyCookBill).dividedBy(daysInMonth * 2);
}

/**
 * Calculates monetary slot debit for regular meal cost.
 *
 * @param mealRate - Current estimated or fixed meal rate in BDT.
 * @returns Meal cost per slot (rate * 0.5) as a Decimal instance.
 */
export function calculateMealCostPerSlot(mealRate: Decimal.Value): Decimal {
  return new Decimal(mealRate).times(MEAL_UNITS_PER_SLOT);
}

/**
 * Converts English digits to Bengali digits.
 *
 * @param input - Number or string containing Arabic digits.
 * @returns String with Bengali numerals.
 */
export function toBengaliDigits(input: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)] || digit);
}

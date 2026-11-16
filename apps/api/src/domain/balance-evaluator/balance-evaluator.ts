import Decimal from 'decimal.js';
import { BalanceStatus, LedgerType } from '@mess/shared';

export interface LedgerTransaction {
  type: LedgerType;
  amount: Decimal.Value;
  date: string;
}

export interface BalanceEvaluationResult {
  currentBalance: Decimal;
  dailyEstimatedCost: Decimal;
  daysRemaining: number;
  status: BalanceStatus;
  graceDaysUsed: number;
  graceDaysLeft: number;
  isAutoOff: boolean;
}

/**
 * Pure domain class for computing real-time balance and evaluating grace period states.
 * Balances are strictly derived from append-only ledger entries.
 */
export class BalanceEvaluator {
  /**
   * Sums ledger entries to compute net balance.
   * Deposits, adjustments, and refunds add to balance;
   * meals, fuel, cook bills, and guest charges subtract.
   *
   * @param transactions - List of append-only ledger transactions.
   * @returns Net balance as Decimal.
   */
  public static computeNetBalance(transactions: LedgerTransaction[]): Decimal {
    let balance = new Decimal(0);
    for (const tx of transactions) {
      // In our ledger, credit entries are positive; debit entries are negative.
      balance = balance.plus(tx.amount);
    }
    return balance;
  }

  /**
   * Evaluates financial health, warnings, grace periods, and auto-off triggers.
   *
   * @param currentBalance - Current net balance from ledger.
   * @param dailyEstimatedCost - Estimated cost of meals per day (2 slots * sum of per slot costs).
   * @param graceDaysAllowed - Total grace days permitted by mess settings (default 3).
   * @param warningDaysThreshold - Days before balance depletion to trigger warning (default 2).
   * @param graceDaysAlreadyUsed - Consecutive active days meals ran while balance <= 0.
   * @returns Detailed balance evaluation and status state.
   */
  public static evaluate(
    currentBalance: Decimal.Value,
    dailyEstimatedCost: Decimal.Value,
    graceDaysAllowed = 3,
    warningDaysThreshold = 2,
    graceDaysAlreadyUsed = 0
  ): BalanceEvaluationResult {
    const balance = new Decimal(currentBalance);
    const dailyCost = new Decimal(dailyEstimatedCost);

    // Days of balance remaining
    const daysRemaining =
      dailyCost.greaterThan(0) && balance.greaterThan(0)
        ? Math.floor(balance.dividedBy(dailyCost).toNumber())
        : 0;

    let status = BalanceStatus.HEALTHY;
    let isAutoOff = false;
    let graceDaysLeft = graceDaysAllowed - graceDaysAlreadyUsed;

    if (balance.greaterThan(0)) {
      if (daysRemaining <= warningDaysThreshold) {
        status = BalanceStatus.WARNING; // Yellow ring
      } else {
        status = BalanceStatus.HEALTHY; // Green ring
      }
    } else {
      // Balance is zero or negative (debt)
      if (graceDaysAlreadyUsed >= graceDaysAllowed) {
        status = BalanceStatus.AUTO_OFF;
        isAutoOff = true;
        graceDaysLeft = 0;
      } else {
        status = BalanceStatus.GRACE; // Red ring: meals running as debt
        graceDaysLeft = Math.max(0, graceDaysAllowed - graceDaysAlreadyUsed);
      }
    }

    return {
      currentBalance: balance,
      dailyEstimatedCost: dailyCost,
      daysRemaining,
      status,
      graceDaysUsed: graceDaysAlreadyUsed,
      graceDaysLeft,
      isAutoOff
    };
  }
}

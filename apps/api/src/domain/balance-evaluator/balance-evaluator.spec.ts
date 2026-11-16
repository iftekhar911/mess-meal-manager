import { BalanceEvaluator } from './balance-evaluator';
import { BalanceStatus, LedgerType } from '@mess/shared';

describe('BalanceEvaluator', () => {
  it('should compute net balance correctly from append-only ledger transactions', () => {
    const transactions = [
      { type: LedgerType.DEPOSIT, amount: 2000, date: '2026-11-01' },
      { type: LedgerType.MEAL, amount: -25, date: '2026-11-01' },
      { type: LedgerType.FUEL, amount: -6.67, date: '2026-11-01' },
      { type: LedgerType.COOK_BILL, amount: -4.17, date: '2026-11-01' },
      { type: LedgerType.MEAL, amount: -25, date: '2026-11-01' }
    ];

    const balance = BalanceEvaluator.computeNetBalance(transactions);
    expect(balance.toFixed(2)).toBe('1939.16');
  });

  it('should return HEALTHY (green) when balance has ample days remaining', () => {
    const currentBalance = 1500;
    const dailyCost = 70; // ~21 days left
    const result = BalanceEvaluator.evaluate(currentBalance, dailyCost, 3, 2);

    expect(result.status).toBe(BalanceStatus.HEALTHY);
    expect(result.daysRemaining).toBe(21);
    expect(result.isAutoOff).toBe(false);
  });

  it('should return WARNING (yellow) when days remaining <= warning threshold (2 days)', () => {
    const currentBalance = 120;
    const dailyCost = 70; // 1 day left
    const result = BalanceEvaluator.evaluate(currentBalance, dailyCost, 3, 2);

    expect(result.status).toBe(BalanceStatus.WARNING);
    expect(result.daysRemaining).toBe(1);
    expect(result.isAutoOff).toBe(false);
  });

  it('should return GRACE (red) when balance <= 0 and within 3 grace days', () => {
    const currentBalance = -50; // Debt
    const dailyCost = 70;
    const graceUsed = 1; // 1st grace day used
    const result = BalanceEvaluator.evaluate(currentBalance, dailyCost, 3, 2, graceUsed);

    expect(result.status).toBe(BalanceStatus.GRACE);
    expect(result.daysRemaining).toBe(0);
    expect(result.graceDaysLeft).toBe(2);
    expect(result.isAutoOff).toBe(false);
  });

  it('should trigger AUTO_OFF when grace days are fully exhausted', () => {
    const currentBalance = -210;
    const dailyCost = 70;
    const graceUsed = 3; // 3 grace days exhausted
    const result = BalanceEvaluator.evaluate(currentBalance, dailyCost, 3, 2, graceUsed);

    expect(result.status).toBe(BalanceStatus.AUTO_OFF);
    expect(result.isAutoOff).toBe(true);
    expect(result.graceDaysLeft).toBe(0);
  });
});

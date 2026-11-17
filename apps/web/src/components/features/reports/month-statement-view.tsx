'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MonthStatementDto,
  toBengaliDigits,
  getDhakaDateString,
  BalanceStatus
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { StatusDot } from '../../ui/status-dot';
import { apiFetch } from '../../../lib/api-client';

export interface MonthStatementViewProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

/**
 * Monthly final accounting statement with printable layout,
 * per-boarder expense breakdown, and manager month-close controls.
 */
export const MonthStatementView: React.FC<MonthStatementViewProps> = ({
  messId,
  isManager = false,
  token
}) => {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const currentMonth = getDhakaDateString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualFuelInput, setActualFuelInput] = useState<number | ''>('');

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const { data: statement, isLoading } = useQuery<MonthStatementDto>({
    queryKey: ['month-statement', messId, selectedMonth],
    queryFn: () =>
      apiFetch<MonthStatementDto>(
        `/messes/${messId}/reports/statement?month=${selectedMonth}`,
        {},
        token
      ),
    enabled: !!messId
  });

  const closeMonthMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/reports/close-month`,
        {
          method: 'POST',
          body: JSON.stringify({
            month: selectedMonth,
            actualFuelCost: actualFuelInput !== '' ? Number(actualFuelInput) : undefined
          })
        },
        token
      ),
    onSuccess: () => {
      setIsCloseModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['month-statement', messId, selectedMonth] });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <p className="text-sm text-text-secondary py-8 text-center">{tCommon('loading')}</p>;
  }

  if (!statement) {
    return (
      <Card className="text-center py-8 text-text-muted text-sm font-medium card-shadow">
        {tCommon('noData')}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Month Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary">{t('statementTitle')}</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {statement.messName} : {selectedMonth}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 rounded-token border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          />

          <Button variant="secondary" size="sm" onClick={handlePrint}>
            {t('exportPdf')}
          </Button>

          {isManager && !statement.isClosed && (
            <Button size="sm" onClick={() => setIsCloseModalOpen(true)}>
              {t('closeMonth')}
            </Button>
          )}

          {statement.isClosed && (
            <span className="text-xs bg-success-surface text-success font-bold px-3 py-1.5 rounded-token border border-success/30">
              {t('monthClosed')}
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3.5 text-center card-shadow">
          <span className="text-xs text-text-secondary block font-semibold">
            {t('actualMealRate')}
          </span>
          <span className="text-xl font-bold text-primary mt-1 block">
            {formatDigit(statement.actualMealRate)} {tCommon('bdt')}
          </span>
        </Card>
        <Card className="p-3.5 text-center card-shadow">
          <span className="text-xs text-text-secondary block font-semibold">{t('totalMeals')}</span>
          <span className="text-xl font-bold text-text-primary mt-1 block">
            {formatDigit(statement.totalMeals)}
          </span>
        </Card>
        <Card className="p-3.5 text-center card-shadow">
          <span className="text-xs text-text-secondary block font-semibold">
            {t('totalMarketCost')}
          </span>
          <span className="text-xl font-bold text-text-primary mt-1 block">
            {formatDigit(statement.totalMarketCost)} {tCommon('bdt')}
          </span>
        </Card>
        <Card className="p-3.5 text-center card-shadow">
          <span className="text-xs text-text-secondary block font-semibold">
            {t('totalFuelCost')}
          </span>
          <span className="text-xl font-bold text-text-primary mt-1 block">
            {formatDigit(statement.totalFuelCost)} {tCommon('bdt')}
          </span>
        </Card>
        <Card className="p-3.5 text-center card-shadow">
          <span className="text-xs text-text-secondary block font-semibold">
            {t('totalDeposits')}
          </span>
          <span className="text-xl font-bold text-success mt-1 block">
            {formatDigit(statement.totalDeposits)} {tCommon('bdt')}
          </span>
        </Card>
      </div>

      {/* Per-Member Financial Statement Table */}
      <Card className="overflow-x-auto p-0 card-shadow">
        <table className="w-full text-left text-sm divide-y divide-border">
          <thead className="bg-surface-elevated text-xs font-semibold text-text-secondary">
            <tr>
              <th className="py-3 px-4">{t('member')}</th>
              <th className="py-3 px-3 text-center">{t('mealCount')}</th>
              <th className="py-3 px-3 text-right">{t('mealCost')}</th>
              <th className="py-3 px-3 text-right">{t('fuelCost')}</th>
              <th className="py-3 px-3 text-right">{t('cookBill')}</th>
              <th className="py-3 px-3 text-right">{t('otherCost')}</th>
              <th className="py-3 px-3 text-right font-bold text-text-primary">{t('totalCost')}</th>
              <th className="py-3 px-3 text-right text-success font-bold">{t('totalDeposits')}</th>
              <th className="py-3 px-4 text-right font-bold text-text-primary">
                {t('balanceDue')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {statement.members.map((m) => (
              <tr key={m.membershipId} className="hover:bg-surface-elevated/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <StatusDot
                      status={
                        m.status === BalanceStatus.HEALTHY
                          ? 'success'
                          : m.status === BalanceStatus.WARNING
                            ? 'warning'
                            : 'danger'
                      }
                    />
                    <div>
                      <span className="font-semibold text-text-primary block">{m.userName}</span>
                      <span className="text-2xs text-text-muted">{m.userPhone}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-semibold">{formatDigit(m.totalMeals)}</td>
                <td className="py-3 px-3 text-right font-medium">{formatDigit(m.mealCost)}</td>
                <td className="py-3 px-3 text-right font-medium">{formatDigit(m.fuelCost)}</td>
                <td className="py-3 px-3 text-right font-medium">{formatDigit(m.cookBill)}</td>
                <td className="py-3 px-3 text-right font-medium">{formatDigit(m.otherDebits)}</td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">
                  {formatDigit(m.totalDebits)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-success">
                  {formatDigit(m.totalDeposits)}
                </td>
                <td
                  className={`py-3 px-4 text-right font-extrabold ${
                    Number(m.finalBalance) < 0 ? 'text-danger' : 'text-primary'
                  }`}
                >
                  {formatDigit(m.finalBalance)} {tCommon('bdt')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Close Month Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={t('closeMonth')}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            মাস সমাপ্ত করার পর মিল রেট চূড়ান্ত হবে এবং ঘাটতি গ্যাস খরচ সদস্যদের হিসাবে আনুপাতিকভাবে সমন্বিত
            হবে। একবার সিল করার পর পূর্ববর্তী তথ্য পরিবর্তন করা যাবে না।
          </p>

          <Input
            label={t('actualFuelCostLabel')}
            type="number"
            step="10"
            value={actualFuelInput}
            onChange={(e) =>
              setActualFuelInput(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder={statement.totalFuelCost}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCloseModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => closeMonthMutation.mutate()}
              isLoading={closeMonthMutation.isPending}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

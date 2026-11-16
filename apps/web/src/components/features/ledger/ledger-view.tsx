'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BalanceEvaluationDto,
  LedgerEntryDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { StatusDot } from '../../ui/status-dot';
import { apiFetch } from '../../../lib/api-client';

export interface LedgerViewProps {
  messId: string;
  membershipId: string;
  isManager?: boolean;
  token?: string;
}

/**
 * Account ledger and balance statement view with manager deposit entry.
 */
export const LedgerView: React.FC<LedgerViewProps> = ({
  messId,
  membershipId,
  isManager = false,
  token
}) => {
  const t = useTranslations('ledger');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [depositNote, setDepositNote] = useState('');
  const [depositDate, setDepositDate] = useState(getDhakaDateString());

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  // Balance query
  const { data: balance, isLoading: isBalanceLoading } = useQuery<BalanceEvaluationDto>({
    queryKey: ['ledger-balance', membershipId],
    queryFn: () =>
      apiFetch<BalanceEvaluationDto>(`/messes/${messId}/ledger/balance/${membershipId}`, {}, token),
    enabled: !!membershipId
  });

  // Statement query
  const { data: statement, isLoading: isStatementLoading } = useQuery<LedgerEntryDto[]>({
    queryKey: ['ledger-statement', membershipId],
    queryFn: () =>
      apiFetch<LedgerEntryDto[]>(`/messes/${messId}/ledger/statement/${membershipId}`, {}, token),
    enabled: !!membershipId
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/deposit`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId,
            amount: depositAmount,
            date: depositDate,
            note: depositNote,
            restoreAutoOffMeals: true
          })
        },
        token
      ),
    onSuccess: () => {
      setIsDepositModalOpen(false);
      setDepositNote('');
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    }
  });

  return (
    <div className="space-y-4">
      {/* Balance Summary Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-text-secondary">{t('balance')}</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold text-text-primary">
              {isBalanceLoading ? '...' : formatDigit(balance?.currentBalance || '0.00')}{' '}
              {tCommon('bdt')}
            </span>
            {balance && (
              <StatusDot
                status={
                  balance.status === 'HEALTHY'
                    ? 'success'
                    : balance.status === 'WARNING'
                      ? 'warning'
                      : 'danger'
                }
              />
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {t('daysLeft')}: {isBalanceLoading ? '...' : formatDigit(balance?.daysRemaining ?? 0)}
          </p>
        </div>

        {isManager && (
          <Button onClick={() => setIsDepositModalOpen(true)} size="sm">
            {t('recordDeposit')}
          </Button>
        )}
      </Card>

      {/* Itemized Statement */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg text-text-primary">{t('title')}</h3>
          <span className="text-xs text-text-muted">{t('reversalNotice')}</span>
        </div>

        {isStatementLoading ? (
          <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
        ) : !statement || statement.length === 0 ? (
          <p className="text-sm text-text-secondary py-6 text-center">{tCommon('error')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs">
                  <th className="py-2 text-left">{tCommon('status')}</th>
                  <th className="py-2 text-left">{tCommon('appName')}</th>
                  <th className="py-2 text-right">{tCommon('bdt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statement.map((entry) => {
                  const isCredit = Number(entry.amount) > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-surface-elevated/50">
                      <td className="py-2.5 text-text-secondary">{entry.date}</td>
                      <td className="py-2.5 text-text-primary font-medium">
                        {entry.type}{' '}
                        {entry.note && (
                          <span className="text-text-muted text-xs">({entry.note})</span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          isCredit ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {formatDigit(entry.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Deposit Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={t('recordDeposit')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('status')}
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
          />

          <Input
            label={t('depositAmount')}
            type="number"
            min="10"
            step="10"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
          />

          <Input
            label={tCommon('appName')}
            placeholder="e.g., Bank transfer or cash"
            value={depositNote}
            onChange={(e) => setDepositNote(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsDepositModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={depositMutation.isPending}
              onClick={() => depositMutation.mutate()}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

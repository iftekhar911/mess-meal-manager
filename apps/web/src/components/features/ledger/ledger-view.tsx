'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BalanceEvaluationDto,
  LedgerEntryDto,
  MembershipDto,
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

  const [activeMemberId, setActiveMemberId] = useState<string>(membershipId);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [depositNote, setDepositNote] = useState('');
  const [depositDate, setDepositDate] = useState(getDhakaDateString());
  const [targetDepositMemberId, setTargetDepositMemberId] = useState<string>(membershipId);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  // Fetch all members if manager
  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () => apiFetch<MembershipDto[]>(`/messes/${messId}/members`, {}, token),
    enabled: !!messId && isManager
  });

  // Balance query
  const { data: balance, isLoading: isBalanceLoading } = useQuery<BalanceEvaluationDto>({
    queryKey: ['ledger-balance', activeMemberId],
    queryFn: () =>
      apiFetch<BalanceEvaluationDto>(
        `/messes/${messId}/ledger/balance/${activeMemberId}`,
        {},
        token
      ),
    enabled: !!activeMemberId
  });

  // Statement query
  const { data: statement, isLoading: isStatementLoading } = useQuery<LedgerEntryDto[]>({
    queryKey: ['ledger-statement', activeMemberId],
    queryFn: () =>
      apiFetch<LedgerEntryDto[]>(`/messes/${messId}/ledger/statement/${activeMemberId}`, {}, token),
    enabled: !!activeMemberId
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/deposit`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: targetDepositMemberId,
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
      {/* Member Filter Bar for Manager */}
      {isManager && members && members.length > 1 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-surface border border-border rounded-token card-shadow">
          <label className="text-xs font-semibold text-text-secondary">{t('selectMember')}:</label>
          <select
            value={activeMemberId}
            onChange={(e) => setActiveMemberId(e.target.value)}
            className="text-xs font-semibold bg-surface-elevated text-text-primary border border-border px-3 py-1.5 rounded-token focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user?.name || 'Member'} ({m.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Balance Summary Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow">
        <div>
          <span className="text-xs font-semibold text-text-secondary block">{t('balance')}</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-extrabold text-text-primary">
              {isBalanceLoading ? '...' : formatDigit(balance?.currentBalance || '0.00')}{' '}
              <span className="text-sm font-semibold text-text-muted">{tCommon('bdt')}</span>
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
          <p className="text-xs text-text-muted mt-1 font-medium">
            {t('daysLeft')}: {isBalanceLoading ? '...' : formatDigit(balance?.daysRemaining ?? 0)}
          </p>
        </div>

        {isManager && (
          <Button
            onClick={() => {
              setTargetDepositMemberId(activeMemberId);
              setIsDepositModalOpen(true);
            }}
            size="md"
          >
            {t('recordDeposit')}
          </Button>
        )}
      </Card>

      {/* Itemized Statement Table */}
      <Card className="card-shadow space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border">
          <h3 className="font-bold text-lg text-text-primary">{t('title')}</h3>
          <span className="text-xs text-text-muted">{t('reversalNotice')}</span>
        </div>

        {isStatementLoading ? (
          <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
        ) : !statement || statement.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center font-medium">{t('noEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs bg-surface-elevated/40">
                  <th className="py-2.5 px-3 text-left font-semibold">{tCommon('date')}</th>
                  <th className="py-2.5 px-3 text-left font-semibold">{tCommon('description')}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{tCommon('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statement.map((entry) => {
                  const isCredit = Number(entry.amount) > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="py-3 px-3 text-text-secondary text-xs whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-3 text-text-primary font-medium">
                        <span className="inline-block mr-1.5 font-semibold text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-border">
                          {entry.type}
                        </span>
                        {entry.note && (
                          <span className="text-text-secondary text-xs">{entry.note}</span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                          isCredit ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {formatDigit(entry.amount)} {tCommon('bdt')}
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
          {isManager && members && members.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1 block">
                {t('selectMember')}
              </label>
              <select
                value={targetDepositMemberId}
                onChange={(e) => setTargetDepositMemberId(e.target.value)}
                className="w-full h-10 px-3 rounded-token border border-border bg-surface text-sm text-text-primary cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.name || 'Member'} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label={tCommon('date')}
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
          />

          <div>
            <Input
              label={t('depositAmount')}
              type="number"
              min="10"
              step="10"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
            {/* Quick preset amount pills */}
            <div className="flex gap-2 mt-2">
              {[500, 1000, 2000, 3000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt)}
                  className={`text-xs px-2.5 py-1 rounded-token border cursor-pointer font-medium ${
                    depositAmount === amt
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-border text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {formatDigit(amt)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={tCommon('note')}
            placeholder="e.g., Bank transfer, bKash, or cash"
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

'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BalanceEvaluationDto,
  LedgerEntryDto,
  LedgerType,
  MembershipDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select } from '../../ui/select';
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
 * Account ledger and balance statement view with localized transaction types
 * and manager deposit entry.
 */
export const LedgerView: React.FC<LedgerViewProps> = ({
  messId,
  membershipId,
  isManager = false,
  token
}) => {
  const t = useTranslations('ledger');
  const tCommon = useTranslations('common');
  const tMembers = useTranslations('members');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [activeMemberId, setActiveMemberId] = useState<string>(membershipId);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [depositNote, setDepositNote] = useState('');
  const [depositDate, setDepositDate] = useState(getDhakaDateString());
  const [targetDepositMemberId, setTargetDepositMemberId] = useState<string>(membershipId);
  const [editingEntry, setEditingEntry] = useState<LedgerEntryDto | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>(getDhakaDateString());
  const [editNote, setEditNote] = useState<string>('');

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const getTypeLabel = (type: LedgerType) => {
    switch (type) {
      case LedgerType.DEPOSIT:
        return t('deposit');
      case LedgerType.FUEL:
        return t('fuelCharge');
      case LedgerType.COOK_BILL:
        return t('cookCharge');
      case LedgerType.ADJUSTMENT:
        return t('adjustment');
      case LedgerType.REFUND:
        return t('refund');
      default:
        return t('mealCharge');
    }
  };

  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () => apiFetch<MembershipDto[]>(`/messes/${messId}/members`, {}, token),
    enabled: !!messId && isManager
  });

  const { data: balance, isLoading: isBalanceLoading } = useQuery<BalanceEvaluationDto>({
    queryKey: ['ledger-balance', messId, activeMemberId],
    queryFn: () =>
      apiFetch<BalanceEvaluationDto>(
        `/messes/${messId}/ledger/balance/${activeMemberId}`,
        {},
        token
      ),
    enabled: !!activeMemberId
  });

  const { data: statement, isLoading: isStatementLoading } = useQuery<LedgerEntryDto[]>({
    queryKey: ['ledger-statement', messId, activeMemberId],
    queryFn: () =>
      apiFetch<LedgerEntryDto[]>(`/messes/${messId}/ledger/statement/${activeMemberId}`, {}, token),
    enabled: !!activeMemberId
  });

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
            note: depositNote
          })
        },
        token
      ),
    onSuccess: () => {
      setIsDepositModalOpen(false);
      setDepositNote('');
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
    }
  });

  const editEntryMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/${editingEntry?.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            amount: editAmount,
            date: editDate,
            note: editNote
          })
        },
        token
      ),
    onSuccess: () => {
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
    }
  });

  const memberOptions = (members || []).map((m) => ({
    value: m.id,
    label: `${m.user?.name || tCommon('member')} (${m.role === 'MANAGER' ? tMembers('manager') : tMembers('boarder')})`
  }));

  return (
    <div className="space-y-4">
      {isManager && members && members.length > 1 && (
        <Card className="p-3.5">
          <Select
            label={t('selectMember')}
            options={memberOptions}
            value={activeMemberId}
            onChange={(e) => setActiveMemberId(e.target.value)}
          />
        </Card>
      )}

      {/* Balance Summary Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            + {t('recordDeposit')}
          </Button>
        )}
      </Card>

      {/* Itemized Statement Table */}
      <Card className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border">
          <h3 className="font-bold text-base sm:text-lg text-text-primary">
            {t('depositHistory')}
          </h3>
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
                  {isManager && (
                    <th className="py-2.5 px-3 text-right font-semibold">{tCommon('actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statement.map((entry) => {
                  const numAmt = Number(entry.amount);
                  const isCredit =
                    entry.type === LedgerType.DEPOSIT ||
                    entry.type === LedgerType.REFUND ||
                    (entry.type === LedgerType.ADJUSTMENT && numAmt > 0);
                  const absFormatted = Math.abs(numAmt).toFixed(2);

                  return (
                    <tr key={entry.id} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="py-3 px-3 text-text-secondary text-xs whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-3 text-text-primary font-medium">
                        <span className="inline-block mr-1.5 font-semibold text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-border">
                          {getTypeLabel(entry.type)}
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
                        {isCredit ? '+' : '-'}
                        {formatDigit(absFormatted)} {tCommon('bdt')}
                      </td>
                      {isManager && (
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-primary px-2"
                            onClick={() => {
                              setEditingEntry(entry);
                              setEditAmount(Number(entry.amount));
                              setEditDate(entry.date);
                              setEditNote(entry.note || '');
                            }}
                          >
                            {tCommon('edit')}
                          </Button>
                        </td>
                      )}
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
          {isManager && members && members.length > 0 && (
            <Select
              label={t('selectMember')}
              options={memberOptions}
              value={targetDepositMemberId}
              onChange={(e) => setTargetDepositMemberId(e.target.value)}
            />
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
            <div className="flex flex-wrap gap-2 mt-2">
              {[500, 1000, 2000, 3000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt)}
                  className={`text-xs px-3 py-1.5 rounded-token border cursor-pointer font-semibold ${
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
            placeholder="bKash, Nagad, Cash"
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
              disabled={depositAmount <= 0}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Deposit / Ledger Entry Modal */}
      <Modal
        isOpen={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        title={t('editDeposit')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('date')}
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <Input
            label={tCommon('amount')}
            type="number"
            step="10"
            value={editAmount}
            onChange={(e) => setEditAmount(Number(e.target.value))}
          />
          <Input
            label={tCommon('note')}
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setEditingEntry(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={editEntryMutation.isPending}
              onClick={() => editEntryMutation.mutate()}
              disabled={editAmount === 0}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

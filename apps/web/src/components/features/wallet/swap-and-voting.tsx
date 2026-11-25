'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MembershipDto,
  ShoppingRosterDto,
  getDhakaDateString,
  toBengaliDigits
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select } from '../../ui/select';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface SwapScreenProps {
  messId: string;
  membershipId: string;
  token?: string;
}

/**
 * Dedicated Swap Request screen showing the boarder's own assigned shopping duties
 * with a clean member-dropdown swap dialog.
 */
export const SwapRequestScreen: React.FC<SwapScreenProps> = ({ messId, membershipId, token }) => {
  const t = useTranslations('wallet');
  const tShopper = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const currentMonth = getDhakaDateString().slice(0, 7);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [targetMemberId, setTargetMemberId] = useState('');

  const { data: roster, isLoading } = useQuery<ShoppingRosterDto[]>({
    queryKey: ['roster', messId, currentMonth],
    queryFn: () =>
      apiFetch<ShoppingRosterDto[]>(`/messes/${messId}/roster?month=${currentMonth}`, {}, token),
    enabled: !!messId
  });

  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () => apiFetch<MembershipDto[]>(`/messes/${messId}/members`, {}, token),
    enabled: !!messId
  });

  const swapMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/swap`,
        {
          method: 'POST',
          body: JSON.stringify({ rosterId: selectedRosterId, toMembershipId: targetMemberId })
        },
        token
      ),
    onSuccess: () => {
      setSelectedRosterId(null);
      setTargetMemberId('');
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  const myDuties = (roster || []).filter((r) => r.membershipId === membershipId);
  const otherMemberOptions = [
    { value: '', label: tShopper('selectSwapMember') },
    ...(members || [])
      .filter((m) => m.id !== membershipId)
      .map((m) => ({ value: m.id, label: m.user?.name || tCommon('member') }))
  ];

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">{t('swapTitle')}</h2>
        <p className="text-xs text-text-secondary mt-0.5">{t('swapHint')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
      ) : myDuties.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">{t('noOwnDuties')}</p>
      ) : (
        <div className="divide-y divide-border">
          {myDuties.map((duty) => (
            <div key={duty.id} className="py-3 flex items-center justify-between gap-3">
              <span className="font-bold text-sm text-text-primary">{duty.date}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedRosterId(duty.id);
                  setTargetMemberId('');
                }}
              >
                {tShopper('swapShopper')}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedRosterId)}
        onClose={() => setSelectedRosterId(null)}
        title={tShopper('swapShopper')}
      >
        <div className="space-y-4">
          <Select
            label={tShopper('selectSwapMember')}
            options={otherMemberOptions}
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setSelectedRosterId(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!targetMemberId}
              isLoading={swapMutation.isPending}
              onClick={() => swapMutation.mutate()}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export interface VotingScreenProps {
  messId: string;
  membershipId: string;
  isVotingOpen: boolean;
  token?: string;
}

/**
 * Next-month bazar date voting screen, active during the voting window.
 */
export const VotingScreen: React.FC<VotingScreenProps> = ({
  messId,
  membershipId,
  isVotingOpen,
  token
}) => {
  const t = useTranslations('wallet');
  const tShopper = useTranslations('shopper');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const today = getDhakaDateString();
  const [y = 2026, m = 1] = today.split('-').map(Number);
  const nextMonthDate = new Date(Date.UTC(y, m, 1));
  const nextMonthStr = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const daysInNext = new Date(
    Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const fmt = (v: number | string) => (locale === 'bn' ? toBengaliDigits(v) : String(v));

  const { data: roster } = useQuery<ShoppingRosterDto[]>({
    queryKey: ['roster', messId, nextMonthStr],
    queryFn: () =>
      apiFetch<ShoppingRosterDto[]>(`/messes/${messId}/roster?month=${nextMonthStr}`, {}, token),
    enabled: !!messId && isVotingOpen
  });

  const voteMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch(
        `/messes/${messId}/roster/vote`,
        { method: 'POST', body: JSON.stringify({ date }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId, nextMonthStr] });
    }
  });

  if (!isVotingOpen) {
    return (
      <Card className="p-6 text-center space-y-2">
        <h2 className="text-base font-bold text-text-primary">{t('votingTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('votingClosed')}</p>
      </Card>
    );
  }

  const days = Array.from({ length: daysInNext }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `${nextMonthStr}-${day}`;
  });

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">{t('votingTitle')}</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('votingHint')} ({nextMonthStr})
        </p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {days.map((dateStr, idx) => {
          const pickedByMe = (roster || []).some(
            (r) => r.date === dateStr && r.membershipId === membershipId
          );
          return (
            <button
              key={dateStr}
              type="button"
              disabled={pickedByMe || voteMutation.isPending}
              onClick={() => voteMutation.mutate(dateStr)}
              className={`h-11 rounded-token border text-sm font-bold transition-colors cursor-pointer ${
                pickedByMe
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-text-primary hover:bg-surface-elevated'
              }`}
              title={tShopper('volunteer')}
            >
              {fmt(idx + 1)}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

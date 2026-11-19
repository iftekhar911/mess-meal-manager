'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MembershipDto,
  ShoppingRosterDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select } from '../../ui/select';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface RosterCalendarProps {
  messId: string;
  membershipId: string;
  isManager?: boolean;
  shoppersPerDay?: number;
  token?: string;
}

/**
 * Monthly shopping roster calendar supporting self-volunteering, manager auto-fill,
 * and member-dropdown swaps.
 */
export const RosterCalendar: React.FC<RosterCalendarProps> = ({
  messId,
  membershipId,
  isManager = false,
  shoppersPerDay = 2,
  token
}) => {
  const t = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const currentMonth = getDhakaDateString().slice(0, 7);
  const [selectedMonth] = useState(currentMonth);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [targetMemberId, setTargetMemberId] = useState('');

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const formatDateLabel = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short'
    }).format(new Date(Date.UTC(y, m - 1, d)));
  };

  const { data: roster, isLoading } = useQuery<ShoppingRosterDto[]>({
    queryKey: ['roster', messId, selectedMonth],
    queryFn: () =>
      apiFetch<ShoppingRosterDto[]>(`/messes/${messId}/roster?month=${selectedMonth}`, {}, token),
    enabled: !!messId
  });

  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () => apiFetch<MembershipDto[]>(`/messes/${messId}/members`, {}, token),
    enabled: !!messId
  });

  const voteMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch(
        `/messes/${messId}/roster/vote`,
        { method: 'POST', body: JSON.stringify({ date }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  const shuffleMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/auto-shuffle?month=${selectedMonth}`,
        { method: 'POST' },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  const swapMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/swap`,
        {
          method: 'POST',
          body: JSON.stringify({
            rosterId: selectedRosterId,
            toMembershipId: targetMemberId
          })
        },
        token
      ),
    onSuccess: () => {
      setIsSwapModalOpen(false);
      setTargetMemberId('');
      setSelectedRosterId(null);
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  const [year, monthNum] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year!, monthNum!, 0)).getUTCDate() || 30;
  const todayStr = getDhakaDateString();

  // Show upcoming days from today first (or all days of the month)
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = String(i + 1).padStart(2, '0');
    return `${selectedMonth}-${dayStr}`;
  });

  const memberOptions = [
    { value: '', label: t('selectSwapMember') },
    ...(members || []).map((m) => ({
      value: m.id,
      label: `${m.user?.name || 'Member'} (${m.user?.phone || ''})`
    }))
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <h3 className="font-bold text-base sm:text-lg text-text-primary">{t('rosterTitle')}</h3>
        {isManager && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => shuffleMutation.mutate()}
            isLoading={shuffleMutation.isPending}
          >
            {t('autoShuffle')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {days.map((dateStr) => {
            const entries = (roster || []).filter((r) => r.date === dateStr);
            const myEntry = entries.find((e) => e.membershipId === membershipId);
            const isFull = entries.length >= shoppersPerDay;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={`p-3 rounded-token border flex flex-col justify-between gap-2 transition-colors ${
                  isToday
                    ? 'border-primary bg-primary-surface/50'
                    : 'border-border bg-surface-elevated/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {formatDateLabel(dateStr)}
                    {isToday && (
                      <span className="ml-1.5 text-xs font-semibold text-primary">
                        ({tCommon('today')})
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    {formatDigit(entries.length)} / {formatDigit(shoppersPerDay)}
                  </span>
                </div>

                <div className="space-y-1">
                  {entries.length === 0 ? (
                    <span className="text-xs text-text-muted">{t('unassigned')}</span>
                  ) : (
                    entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {entry.member?.user?.name || tCommon('member')}
                        </span>
                        {(entry.membershipId === membershipId || isManager) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRosterId(entry.id);
                              setTargetMemberId('');
                              setIsSwapModalOpen(true);
                            }}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
                          >
                            {t('swapShopper')}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!myEntry && !isFull && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-8 text-xs"
                    onClick={() => voteMutation.mutate(dateStr)}
                    isLoading={voteMutation.isPending}
                  >
                    {t('volunteer')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Swap Shopper Modal with Member Dropdown */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        title={t('swapShopper')}
      >
        <div className="space-y-4">
          <Select
            label={t('selectSwapMember')}
            options={memberOptions}
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsSwapModalOpen(false)}>
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

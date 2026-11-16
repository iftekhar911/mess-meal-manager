'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingRosterDto, toBengaliDigits, getDhakaDateString } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
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
 * Monthly shopping roster calendar supporting voting, auto-shuffle, and swaps.
 */
export const RosterCalendar: React.FC<RosterCalendarProps> = ({
  messId,
  membershipId,
  isManager = false,
  shoppersPerDay = 2,
  token
}) => {
  const t = useTranslations('nav');
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

  const { data: roster, isLoading } = useQuery<ShoppingRosterDto[]>({
    queryKey: ['roster', messId, selectedMonth],
    queryFn: () =>
      apiFetch<ShoppingRosterDto[]>(`/messes/${messId}/roster?month=${selectedMonth}`, {}, token),
    enabled: !!messId
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch(
        `/messes/${messId}/roster/vote`,
        {
          method: 'POST',
          body: JSON.stringify({ date })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  // Auto-shuffle mutation
  const shuffleMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/auto-shuffle?month=${selectedMonth}`,
        {
          method: 'POST'
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  // Swap mutation
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
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
    }
  });

  const [year, m] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year!, m!, 0)).getUTCDate();

  const daysList = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const dayAssignments = (roster || []).filter((r) => r.date === dateStr);
    const hasVoted = dayAssignments.some((r) => r.membershipId === membershipId);
    const isFull = dayAssignments.length >= shoppersPerDay;
    return {
      day,
      dateStr,
      assignments: dayAssignments,
      hasVoted,
      isFull
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-text-primary">{t('shopping')}</h3>
        {isManager && (
          <Button
            size="sm"
            variant="secondary"
            isLoading={shuffleMutation.isPending}
            onClick={() => shuffleMutation.mutate()}
          >
            {tCommon('actions')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {daysList.map((d) => (
            <Card key={d.dateStr} className="p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-bold text-sm text-text-primary">
                    {formatDigit(d.day)} {selectedMonth}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatDigit(d.assignments.length)} / {formatDigit(shoppersPerDay)}
                  </span>
                </div>

                <div className="py-2 space-y-1.5 min-h-[50px]">
                  {d.assignments.length === 0 ? (
                    <span className="text-xs text-text-muted italic">{tCommon('status')}</span>
                  ) : (
                    d.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs bg-surface-elevated px-2 py-1 rounded-token"
                      >
                        <span className="font-medium text-text-primary">
                          {a.member?.user?.name || 'Shopper'}
                        </span>
                        {a.membershipId === membershipId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRosterId(a.id);
                              setIsSwapModalOpen(true);
                            }}
                            className="text-primary hover:underline text-[10px]"
                          >
                            {tCommon('edit')}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!d.hasVoted && !d.isFull && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mt-2"
                  isLoading={voteMutation.isPending}
                  onClick={() => voteMutation.mutate(d.dateStr)}
                >
                  {tCommon('confirm')}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Swap Request Modal */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        title={tCommon('edit')}
      >
        <div className="space-y-4">
          <Input
            label="Target Boarder Membership ID"
            placeholder="Paste member UUID"
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsSwapModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={swapMutation.isPending}
              onClick={() => swapMutation.mutate()}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

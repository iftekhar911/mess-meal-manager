'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EggPreference,
  SlotType,
  getDhakaDateString,
  getNextDateString,
  toBengaliDigits
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { MealPreferences } from '../meal-preferences/meal-preferences';
import { apiFetch } from '../../../lib/api-client';

export interface MealManagementScreenProps {
  messId: string;
  membershipId: string;
  tomorrowLunchOn: boolean;
  tomorrowDinnerOn: boolean;
  isAutoOff?: boolean;
  token?: string;
}

/**
 * Tomorrow-first Meal Management screen.
 * Primary surface handles tomorrow's lunch and dinner in seconds;
 * advanced controls (full/half, egg, guest, single-day, date-range leave,
 * continuous switch, default profile) live cleanly under More options.
 */
export const MealManagementScreen: React.FC<MealManagementScreenProps> = ({
  messId,
  membershipId,
  tomorrowLunchOn,
  tomorrowDinnerOn,
  isAutoOff = false,
  token
}) => {
  const t = useTranslations('wallet');
  const tMeals = useTranslations('meals');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const todayStr = getDhakaDateString();
  const tomorrowStr = getNextDateString(todayStr);

  const [showMore, setShowMore] = useState(false);
  const [leaveStart, setLeaveStart] = useState(tomorrowStr);
  const [leaveEnd, setLeaveEnd] = useState(getNextDateString(tomorrowStr));
  const [leaveSavedMsg, setLeaveSavedMsg] = useState(false);

  const fmt = (v: number | string) => (locale === 'bn' ? toBengaliDigits(v) : String(v));

  const slotMutation = useMutation({
    mutationFn: ({ slot, status }: { slot: SlotType; status: boolean }) =>
      apiFetch(
        `/messes/${messId}/meals/override/${membershipId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: tomorrowStr,
            slot,
            status,
            eggPreference: EggPreference.NONE,
            guestCount: 0
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    }
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/meals/leave/${membershipId}`,
        {
          method: 'POST',
          body: JSON.stringify({ startDate: leaveStart, endDate: leaveEnd })
        },
        token
      ),
    onSuccess: () => {
      setLeaveSavedMsg(true);
      setTimeout(() => setLeaveSavedMsg(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
    }
  });

  return (
    <div className="space-y-4">
      {/* Tomorrow First Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{t('tomorrowMeal')}</h2>
            <p className="text-xs text-text-secondary">{fmt(tomorrowStr)}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={isAutoOff || slotMutation.isPending}
            onClick={() => {
              const nextState = !(tomorrowLunchOn || tomorrowDinnerOn);
              slotMutation.mutate({ slot: SlotType.LUNCH, status: nextState });
              slotMutation.mutate({ slot: SlotType.DINNER, status: nextState });
            }}
          >
            {tomorrowLunchOn || tomorrowDinnerOn ? tMeals('off') : tMeals('on')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isAutoOff || slotMutation.isPending}
            onClick={() => slotMutation.mutate({ slot: SlotType.LUNCH, status: !tomorrowLunchOn })}
            className={`p-4 rounded-token border-2 text-left transition-colors cursor-pointer disabled:opacity-50 ${
              tomorrowLunchOn
                ? 'border-success bg-success-surface text-success'
                : 'border-border bg-surface-elevated text-text-secondary'
            }`}
          >
            <span className="text-xs font-semibold block">{tMeals('lunch')}</span>
            <span className="text-xl font-extrabold mt-1 block">
              {tomorrowLunchOn ? tMeals('on') : tMeals('off')}
            </span>
          </button>

          <button
            type="button"
            disabled={isAutoOff || slotMutation.isPending}
            onClick={() =>
              slotMutation.mutate({ slot: SlotType.DINNER, status: !tomorrowDinnerOn })
            }
            className={`p-4 rounded-token border-2 text-left transition-colors cursor-pointer disabled:opacity-50 ${
              tomorrowDinnerOn
                ? 'border-success bg-success-surface text-success'
                : 'border-border bg-surface-elevated text-text-secondary'
            }`}
          >
            <span className="text-xs font-semibold block">{tMeals('dinner')}</span>
            <span className="text-xl font-extrabold mt-1 block">
              {tomorrowDinnerOn ? tMeals('on') : tMeals('off')}
            </span>
          </button>
        </div>
      </Card>

      {/* Expandable More Options */}
      <Button variant="secondary" className="w-full" onClick={() => setShowMore((prev) => !prev)}>
        {showMore ? t('hideOptions') : t('moreOptions')}
      </Button>

      {showMore && (
        <div className="space-y-4">
          {/* Date-Range Leave Card */}
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">{t('dateRangeLeave')}</h3>
            {leaveSavedMsg && (
              <p className="text-xs font-semibold text-success bg-success-surface p-2.5 rounded-token">
                {t('leaveSaved')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('leaveStart')}
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
              />
              <Input
                label={t('leaveEnd')}
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              isLoading={leaveMutation.isPending}
              disabled={!leaveStart || !leaveEnd || leaveEnd < leaveStart}
              onClick={() => leaveMutation.mutate()}
            >
              {t('applyLeave')}
            </Button>
          </Card>

          {/* Full/Half, Egg Preference, Guest Count, Single-Day Override, Continuous Switch, Default Profile */}
          <MealPreferences messId={messId} membershipId={membershipId} token={token} />
        </div>
      )}
    </div>
  );
};

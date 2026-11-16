'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MealType, SlotType, EggPreference, getDhakaDateString } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface MealPreferencesProps {
  messId: string;
  membershipId: string;
  token?: string;
  initialMealType?: MealType;
  initialHalfSlot?: SlotType | null;
  initialEggPreference?: EggPreference;
  initialToggleStatus?: boolean;
}

/**
 * Boarder meal preferences panel: continuous toggle, permanent default, and overrides.
 */
export const MealPreferences: React.FC<MealPreferencesProps> = ({
  messId,
  membershipId,
  token,
  initialMealType = MealType.FULL,
  initialHalfSlot = null,
  initialEggPreference = EggPreference.NONE,
  initialToggleStatus = true
}) => {
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [halfSlot, setHalfSlot] = useState<SlotType | null>(initialHalfSlot);
  const [eggPreference, setEggPreference] = useState<EggPreference>(initialEggPreference);
  const [isToggleOn, setIsToggleOn] = useState<boolean>(initialToggleStatus);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState(getDhakaDateString());
  const [overrideSlot, setOverrideSlot] = useState<SlotType>(SlotType.LUNCH);
  const [overrideStatus, setOverrideStatus] = useState(true);
  const [overrideEgg, setOverrideEgg] = useState<EggPreference>(EggPreference.NONE);
  const [guestCount, setGuestCount] = useState(0);

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (status: boolean) =>
      apiFetch(
        `/messes/${messId}/meals/toggle/${membershipId}`,
        {
          method: 'POST',
          body: JSON.stringify({ status })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    }
  });

  // Default profile mutation
  const defaultMutation = useMutation({
    mutationFn: (data: {
      mealType: MealType;
      halfSlot: SlotType | null;
      eggPreference: EggPreference;
    }) =>
      apiFetch(
        `/messes/${messId}/meals/default/${membershipId}`,
        {
          method: 'POST',
          body: JSON.stringify(data)
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    }
  });

  // Single-day override mutation
  const overrideMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/meals/override/${membershipId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: overrideDate,
            slot: overrideSlot,
            status: overrideStatus,
            eggPreference: overrideEgg,
            guestCount
          })
        },
        token
      ),
    onSuccess: () => {
      setIsOverrideModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    }
  });

  const handleToggle = (checked: boolean) => {
    setIsToggleOn(checked);
    toggleMutation.mutate(checked);
  };

  return (
    <div className="space-y-4">
      {/* Continuous Toggle Switch */}
      <Card className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{t('continuousToggle')}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{t('lockNotice')}</p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isToggleOn)}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            isToggleOn ? 'bg-primary' : 'bg-border-strong'
          }`}
          role="switch"
          aria-checked={isToggleOn}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              isToggleOn ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </Card>

      {/* Permanent Default Settings */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-lg text-text-primary">{t('title')}</h3>

        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            {t('fullMeal')}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMealType(MealType.FULL);
                setHalfSlot(null);
              }}
              className={`h-10 px-4 rounded-token text-sm font-medium border ${
                mealType === MealType.FULL
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-text-secondary'
              }`}
            >
              {t('fullMeal')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMealType(MealType.HALF);
                setHalfSlot(SlotType.LUNCH);
              }}
              className={`h-10 px-4 rounded-token text-sm font-medium border ${
                mealType === MealType.HALF
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-text-secondary'
              }`}
            >
              {t('halfMeal')}
            </button>
          </div>
        </div>

        {mealType === MealType.HALF && (
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              {t('halfMeal')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHalfSlot(SlotType.LUNCH)}
                className={`h-10 px-4 rounded-token text-sm font-medium border ${
                  halfSlot === SlotType.LUNCH
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('lunch')}
              </button>
              <button
                type="button"
                onClick={() => setHalfSlot(SlotType.DINNER)}
                className={`h-10 px-4 rounded-token text-sm font-medium border ${
                  halfSlot === SlotType.DINNER
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('dinner')}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            {t('eggPreference')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { key: EggPreference.NONE, label: t('eggNone') },
              { key: EggPreference.INSTEAD_OF_FISH, label: t('eggInsteadOfFish') },
              { key: EggPreference.INSTEAD_OF_CHICKEN, label: t('eggInsteadOfChicken') }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setEggPreference(item.key)}
                className={`h-10 px-3 rounded-token text-sm font-medium border text-left ${
                  eggPreference === item.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsOverrideModalOpen(true)}
          >
            {t('guestCount')}
          </Button>

          <Button
            type="button"
            size="sm"
            isLoading={defaultMutation.isPending}
            onClick={() => defaultMutation.mutate({ mealType, halfSlot, eggPreference })}
          >
            {tCommon('save')}
          </Button>
        </div>
      </Card>

      {/* Single-Day Override Modal */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={t('title')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('status')}
            type="date"
            value={overrideDate}
            onChange={(e) => setOverrideDate(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('lunch')} / {t('dinner')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOverrideSlot(SlotType.LUNCH)}
                className={`h-10 px-4 rounded-token text-sm font-medium border ${
                  overrideSlot === SlotType.LUNCH
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('lunch')}
              </button>
              <button
                type="button"
                onClick={() => setOverrideSlot(SlotType.DINNER)}
                className={`h-10 px-4 rounded-token text-sm font-medium border ${
                  overrideSlot === SlotType.DINNER
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('dinner')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-token">
            <span className="text-sm font-medium text-text-primary">{t('fullMeal')}</span>
            <button
              type="button"
              onClick={() => setOverrideStatus(!overrideStatus)}
              className={`h-8 px-3 rounded-token text-xs font-semibold ${
                overrideStatus ? 'bg-success text-white' : 'bg-danger text-white'
              }`}
            >
              {overrideStatus ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('eggPreference')}
            </label>
            <div className="flex gap-2">
              {[
                { key: EggPreference.NONE, label: t('eggNone') },
                { key: EggPreference.INSTEAD_OF_FISH, label: t('eggInsteadOfFish') },
                { key: EggPreference.INSTEAD_OF_CHICKEN, label: t('eggInsteadOfChicken') }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOverrideEgg(item.key)}
                  className={`h-9 px-2.5 rounded-token text-xs font-medium border ${
                    overrideEgg === item.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-border text-text-secondary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('guestCount')}
            type="number"
            min="0"
            max="20"
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsOverrideModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={overrideMutation.isPending}
              onClick={() => overrideMutation.mutate()}
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

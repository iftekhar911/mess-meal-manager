'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MealType,
  SlotType,
  EggPreference,
  getDhakaDateString,
  toBengaliDigits
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface MealPreferencesProps {
  messId: string;
  membershipId: string;
  token?: string;
}

interface PreferencesDto {
  mealType: MealType;
  halfSlot: SlotType | null;
  eggPreference: EggPreference;
  isToggleOn: boolean;
}

/**
 * Boarder meal preferences panel: continuous switch, regular meal plan, egg preference, and single-day overrides.
 */
export const MealPreferences: React.FC<MealPreferencesProps> = ({
  messId,
  membershipId,
  token
}) => {
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [mealType, setMealType] = useState<MealType>(MealType.FULL);
  const [halfSlot, setHalfSlot] = useState<SlotType | null>(null);
  const [eggPreference, setEggPreference] = useState<EggPreference>(EggPreference.NONE);
  const [isToggleOn, setIsToggleOn] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState(getDhakaDateString());
  const [overrideSlot, setOverrideSlot] = useState<SlotType>(SlotType.LUNCH);
  const [overrideStatus, setOverrideStatus] = useState(true);
  const [overrideEgg, setOverrideEgg] = useState<EggPreference>(EggPreference.NONE);
  const [guestCount, setGuestCount] = useState(0);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const invalidateMealQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
    queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    queryClient.invalidateQueries({ queryKey: ['meal-preferences', messId, membershipId] });
  };

  const showSaved = () => {
    setSaveSuccessMsg(t('preferencesSaved'));
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const { data: savedPrefs } = useQuery<PreferencesDto>({
    queryKey: ['meal-preferences', messId, membershipId],
    queryFn: () =>
      apiFetch<PreferencesDto>(`/messes/${messId}/meals/preferences/${membershipId}`, {}, token),
    enabled: !!messId && !!membershipId
  });

  useEffect(() => {
    if (savedPrefs) {
      setMealType(savedPrefs.mealType);
      setHalfSlot(savedPrefs.halfSlot);
      setEggPreference(savedPrefs.eggPreference);
      setIsToggleOn(savedPrefs.isToggleOn);
    }
  }, [savedPrefs]);

  const toggleMutation = useMutation({
    mutationFn: (status: boolean) =>
      apiFetch(
        `/messes/${messId}/meals/toggle/${membershipId}`,
        { method: 'POST', body: JSON.stringify({ status }) },
        token
      ),
    onSuccess: () => {
      invalidateMealQueries();
      showSaved();
    }
  });

  const defaultMutation = useMutation({
    mutationFn: (data: {
      mealType: MealType;
      halfSlot: SlotType | null;
      eggPreference: EggPreference;
    }) =>
      apiFetch(
        `/messes/${messId}/meals/default/${membershipId}`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    onSuccess: () => {
      invalidateMealQueries();
      showSaved();
    }
  });

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
      invalidateMealQueries();
      showSaved();
    }
  });

  const handleToggle = (checked: boolean) => {
    setIsToggleOn(checked);
    toggleMutation.mutate(checked);
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    defaultMutation.mutate({
      mealType,
      halfSlot: mealType === MealType.HALF ? halfSlot || SlotType.LUNCH : null,
      eggPreference
    });
  };

  return (
    <div className="space-y-4">
      {saveSuccessMsg && (
        <div className="p-3 rounded-token bg-success-surface border border-success/30 text-success text-sm font-semibold flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-success font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Continuous Toggle Switch Card */}
      <Card className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base sm:text-lg text-text-primary">
              {t('continuousToggle')}
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isToggleOn ? 'bg-success-surface text-success' : 'bg-danger-surface text-danger'
              }`}
            >
              {isToggleOn ? t('on') : t('off')}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">{t('lockNotice')}</p>
        </div>

        <button
          type="button"
          onClick={() => handleToggle(!isToggleOn)}
          className={`w-14 h-8 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
            isToggleOn ? 'bg-primary' : 'bg-border-strong'
          }`}
          role="switch"
          aria-checked={isToggleOn}
        >
          <div
            className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
              isToggleOn ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </Card>

      {/* Regular Daily Meal Plan */}
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <h3 className="font-bold text-base sm:text-lg text-text-primary">{t('title')}</h3>
          <Button size="sm" variant="secondary" onClick={() => setIsOverrideModalOpen(true)}>
            {t('overrideTitle')}
          </Button>
        </div>

        <form onSubmit={handleSaveDefaults} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">
              {t('mealPlanType')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMealType(MealType.FULL)}
                className={`p-3.5 rounded-token border text-left transition-all cursor-pointer ${
                  mealType === MealType.FULL
                    ? 'border-primary bg-primary-surface text-primary'
                    : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <span className="font-bold text-sm sm:text-base block">{t('fullMeal')}</span>
                <span className="text-xs text-text-muted mt-0.5 block">{t('lunchDinner')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMealType(MealType.HALF);
                  if (!halfSlot) setHalfSlot(SlotType.LUNCH);
                }}
                className={`p-3.5 rounded-token border text-left transition-all cursor-pointer ${
                  mealType === MealType.HALF
                    ? 'border-primary bg-primary-surface text-primary'
                    : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <span className="font-bold text-sm sm:text-base block">{t('halfMeal')}</span>
                <span className="text-xs text-text-muted mt-0.5 block">
                  {t('lunch')} / {t('dinner')}
                </span>
              </button>
            </div>
          </div>

          {mealType === MealType.HALF && (
            <div className="p-3.5 rounded-token bg-surface-elevated/60 border border-border space-y-2">
              <span className="text-xs font-semibold text-text-primary block">
                {t('halfMealChoice')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHalfSlot(SlotType.LUNCH)}
                  className={`h-10 rounded-token text-sm font-semibold border transition-all cursor-pointer ${
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
                  className={`h-10 rounded-token text-sm font-semibold border transition-all cursor-pointer ${
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
            <label className="text-sm font-semibold text-text-primary mb-2 block">
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
                  className={`p-3 rounded-token text-xs sm:text-sm font-medium border text-center transition-all cursor-pointer ${
                    eggPreference === item.key
                      ? 'border-primary bg-primary text-white font-semibold'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button type="submit" isLoading={defaultMutation.isPending} size="md">
              {t('savePreference')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Single-Day Override Modal */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={t('overrideTitle')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('date')}
            type="date"
            value={overrideDate}
            onChange={(e) => setOverrideDate(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
              {t('slot')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOverrideSlot(SlotType.LUNCH)}
                className={`h-10 rounded-token text-sm font-semibold border cursor-pointer ${
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
                className={`h-10 rounded-token text-sm font-semibold border cursor-pointer ${
                  overrideSlot === SlotType.DINNER
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('dinner')}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
              {t('status')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOverrideStatus(true)}
                className={`h-10 rounded-token text-sm font-semibold border cursor-pointer ${
                  overrideStatus
                    ? 'bg-success text-white border-success'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('on')}
              </button>
              <button
                type="button"
                onClick={() => setOverrideStatus(false)}
                className={`h-10 rounded-token text-sm font-semibold border cursor-pointer ${
                  !overrideStatus
                    ? 'bg-danger text-white border-danger'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {t('off')}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
              {t('guestCount')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuestCount((c) => Math.max(0, c - 1))}
                className="w-10 h-10 rounded-token border border-border bg-surface text-lg font-bold hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="text-lg font-bold text-text-primary min-w-[32px] text-center">
                {formatDigit(guestCount)}
              </span>
              <button
                type="button"
                onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                className="w-10 h-10 rounded-token border border-border bg-surface text-lg font-bold hover:bg-surface-elevated flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
              {t('eggPreference')}
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { key: EggPreference.NONE, label: t('eggNone') },
                { key: EggPreference.INSTEAD_OF_FISH, label: t('eggInsteadOfFish') },
                { key: EggPreference.INSTEAD_OF_CHICKEN, label: t('eggInsteadOfChicken') }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOverrideEgg(item.key)}
                  className={`p-2.5 rounded-token text-xs font-medium border text-left cursor-pointer ${
                    overrideEgg === item.key
                      ? 'border-primary bg-primary text-white font-semibold'
                      : 'border-border bg-surface text-text-secondary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsOverrideModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={overrideMutation.isPending}
              onClick={() => overrideMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

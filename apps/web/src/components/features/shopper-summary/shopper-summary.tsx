'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProteinType, toBengaliDigits, ShopperDailySummaryDto, DailyMenuDto } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { apiFetch } from '../../../lib/api-client';

export interface ShopperSummaryProps {
  summary: ShopperDailySummaryDto;
  token?: string;
  isShopperOrManager?: boolean;
}

/**
 * Shopper summary dashboard displaying aggregated counts and dual Lunch + Dinner daily menu entry.
 */
export const ShopperSummary: React.FC<ShopperSummaryProps> = ({
  summary,
  token,
  isShopperOrManager = false
}) => {
  const t = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [lunchProtein, setLunchProtein] = useState<ProteinType>(
    summary.menu?.lunchProtein || summary.menu?.protein || ProteinType.FISH
  );
  const [lunchNote, setLunchNote] = useState<string>(
    summary.menu?.lunchNote ?? summary.menu?.note ?? ''
  );
  const [dinnerProtein, setDinnerProtein] = useState<ProteinType>(
    summary.menu?.dinnerProtein || ProteinType.OTHER
  );
  const [dinnerNote, setDinnerNote] = useState<string>(summary.menu?.dinnerNote ?? '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (summary.menu) {
      setLunchProtein(summary.menu.lunchProtein || summary.menu.protein || ProteinType.FISH);
      setLunchNote(summary.menu.lunchNote ?? summary.menu.note ?? '');
      setDinnerProtein(summary.menu.dinnerProtein || ProteinType.OTHER);
      setDinnerNote(summary.menu.dinnerNote ?? '');
    }
  }, [summary.menu]);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const getProteinLabel = (p: ProteinType) => {
    if (p === ProteinType.FISH) return t('proteinFish');
    if (p === ProteinType.CHICKEN) return t('proteinChicken');
    return t('proteinOther');
  };

  const menuMutation = useMutation({
    mutationFn: () =>
      apiFetch<DailyMenuDto>(
        `/messes/${summary.messId}/menus`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: summary.date,
            lunchProtein,
            lunchNote,
            dinnerProtein,
            dinnerNote
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  });

  const proteinOptions = [
    { key: ProteinType.FISH, label: t('proteinFish') },
    { key: ProteinType.CHICKEN, label: t('proteinChicken') },
    { key: ProteinType.OTHER, label: t('proteinOther') }
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">{t('lunchCount')}</span>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {formatDigit(summary.lunchMeals)}
          </p>
        </Card>

        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">{t('dinnerCount')}</span>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {formatDigit(summary.dinnerMeals)}
          </p>
        </Card>

        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">{t('totalMeals')}</span>
          <p className="text-2xl font-bold text-primary mt-1">
            {formatDigit(summary.totalMealUnits)}
          </p>
        </Card>

        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">{t('eggTotal')}</span>
          <p className="text-2xl font-bold text-warning mt-1">{formatDigit(summary.eggCount)}</p>
        </Card>

        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">{t('guestTotal')}</span>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {formatDigit(summary.guestCount)}
          </p>
        </Card>

        <Card className="text-center p-3.5">
          <span className="text-xs text-text-secondary block font-medium">
            {t('budgetRequired')}
          </span>
          <p className="text-xl font-bold text-primary mt-1">
            {formatDigit(summary.estimatedBudget)} {tCommon('bdt')}
          </p>
        </Card>
      </div>

      {/* Dual Daily Menu Section: Lunch + Dinner */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-bold text-base sm:text-lg text-text-primary">{t('todayMenu')}</h3>
          {savedSuccess && (
            <span className="text-xs text-success font-semibold px-2.5 py-1 rounded-full bg-success-surface border border-success/30">
              {tCommon('success')}
            </span>
          )}
        </div>

        {isShopperOrManager ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              menuMutation.mutate();
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lunch Menu Box */}
              <div className="p-4 rounded-token bg-surface-elevated/40 border border-border space-y-3">
                <h4 className="font-bold text-sm text-primary">{t('lunchMenu')}</h4>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                    {t('protein')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {proteinOptions.map((item) => (
                      <button
                        key={`lunch-${item.key}`}
                        type="button"
                        onClick={() => setLunchProtein(item.key)}
                        className={`h-9 px-2 rounded-token text-xs font-semibold transition-all border cursor-pointer ${
                          lunchProtein === item.key
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border text-text-secondary hover:bg-surface-elevated'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label={t('lunchMenu')}
                  placeholder={t('lunchMenuPlaceholder')}
                  value={lunchNote}
                  onChange={(e) => setLunchNote(e.target.value)}
                />
              </div>

              {/* Dinner Menu Box */}
              <div className="p-4 rounded-token bg-surface-elevated/40 border border-border space-y-3">
                <h4 className="font-bold text-sm text-primary">{t('dinnerMenu')}</h4>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                    {t('protein')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {proteinOptions.map((item) => (
                      <button
                        key={`dinner-${item.key}`}
                        type="button"
                        onClick={() => setDinnerProtein(item.key)}
                        className={`h-9 px-2 rounded-token text-xs font-semibold transition-all border cursor-pointer ${
                          dinnerProtein === item.key
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border text-text-secondary hover:bg-surface-elevated'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label={t('dinnerMenu')}
                  placeholder={t('dinnerMenuPlaceholder')}
                  value={dinnerNote}
                  onChange={(e) => setDinnerNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button type="submit" isLoading={menuMutation.isPending} size="sm">
                {tCommon('save')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-surface-elevated/60 rounded-token border border-border space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-secondary">{t('lunchMenu')}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-surface text-primary">
                  {getProteinLabel(lunchProtein)}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {lunchNote || t('noMenuSet')}
              </p>
            </div>

            <div className="p-4 bg-surface-elevated/60 rounded-token border border-border space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-secondary">{t('dinnerMenu')}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-surface text-primary">
                  {getProteinLabel(dinnerProtein)}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {dinnerNote || t('noMenuSet')}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
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
 * Shopper summary dashboard displaying aggregated counts and menu entry.
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

  const [protein, setProtein] = useState<ProteinType>(summary.menu?.protein || ProteinType.OTHER);
  const [note, setNote] = useState<string>(summary.menu?.note || '');

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const menuMutation = useMutation({
    mutationFn: (data: { protein: ProteinType; note: string }) =>
      apiFetch<DailyMenuDto>(
        `/messes/${summary.messId}/menus`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: summary.date,
            protein: data.protein,
            note: data.note
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
    }
  });

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('lunchCount')}</span>
          <p className="text-xl font-bold text-text-primary mt-1">
            {formatDigit(summary.lunchMeals)}
          </p>
        </Card>

        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('dinnerCount')}</span>
          <p className="text-xl font-bold text-text-primary mt-1">
            {formatDigit(summary.dinnerMeals)}
          </p>
        </Card>

        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('totalMeals')}</span>
          <p className="text-xl font-bold text-primary mt-1">
            {formatDigit(summary.totalMealUnits)}
          </p>
        </Card>

        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('eggTotal')}</span>
          <p className="text-xl font-bold text-warning mt-1">{formatDigit(summary.eggCount)}</p>
        </Card>

        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('guestTotal')}</span>
          <p className="text-xl font-bold text-text-primary mt-1">
            {formatDigit(summary.guestCount)}
          </p>
        </Card>

        <Card className="text-center p-3">
          <span className="text-xs text-text-secondary">{t('budgetRequired')}</span>
          <p className="text-xl font-bold text-primary mt-1">
            {formatDigit(summary.estimatedBudget)} {tCommon('bdt')}
          </p>
        </Card>
      </div>

      {/* Daily Menu Section */}
      <Card>
        <h3 className="font-semibold text-lg text-text-primary mb-3">{t('todayMenu')}</h3>

        {isShopperOrManager ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              menuMutation.mutate({ protein, note });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block">
                {t('protein')}
              </label>
              <div className="flex gap-2">
                {[
                  { key: ProteinType.FISH, label: t('proteinFish') },
                  { key: ProteinType.CHICKEN, label: t('proteinChicken') },
                  { key: ProteinType.OTHER, label: t('proteinOther') }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setProtein(item.key)}
                    className={`h-10 px-4 rounded-token text-sm font-medium transition-colors border ${
                      protein === item.key
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
              label={t('todayMenu')}
              placeholder={t('menuPlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={menuMutation.isPending} size="sm">
                {tCommon('save')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-surface-elevated rounded-token border border-border">
            <p className="text-base text-text-primary">
              <span className="font-semibold">{t('protein')}: </span>
              {protein === ProteinType.FISH
                ? t('proteinFish')
                : protein === ProteinType.CHICKEN
                  ? t('proteinChicken')
                  : t('proteinOther')}
            </p>
            {note && <p className="text-sm text-text-secondary mt-1">{note}</p>}
          </div>
        )}
      </Card>
    </div>
  );
};

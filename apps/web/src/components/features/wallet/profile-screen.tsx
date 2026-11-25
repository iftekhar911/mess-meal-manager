'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BalanceEvaluationDto,
  BalanceStatus,
  MessDto,
  UserDto,
  toBengaliDigits
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { StatusDot } from '../../ui/status-dot';
import { LanguageSwitcher } from '../../ui/language-switcher';
import { LedgerView } from '../ledger/ledger-view';
import { MealHeatmap, HeatmapRow } from '../meal-heatmap/meal-heatmap';
import { MealPreferences } from '../meal-preferences/meal-preferences';

export interface ProfileScreenProps {
  user: UserDto;
  mess: MessDto;
  messes: MessDto[];
  membershipId: string;
  balance?: BalanceEvaluationDto;
  ownHeatmapData?: { month: string; daysInMonth: number; rows: HeatmapRow[] };
  token?: string;
  onSelectMess: (messId: string) => void;
  onCreateMess: () => void;
  onLogout: () => void;
}

/**
 * Private Profile screen: shows ONLY the user's own balance (tap to reveal),
 * own deposits and expenses ledger, own meal grid, defaults, and language switcher.
 * Never displays another member's money data.
 */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  mess,
  messes,
  membershipId,
  balance,
  ownHeatmapData,
  token,
  onSelectMess,
  onCreateMess,
  onLogout
}) => {
  const t = useTranslations('wallet');
  const tCommon = useTranslations('common');
  const tMess = useTranslations('messes');
  const tLedger = useTranslations('ledger');
  const locale = useLocale();

  const [section, setSection] = useState<'ledger' | 'grid' | 'defaults'>('ledger');
  const [balanceRevealed, setBalanceRevealed] = useState(false);

  const fmt = (v: number | string) => (locale === 'bn' ? toBengaliDigits(v) : String(v));

  const ownRows = (ownHeatmapData?.rows || []).filter((r) => r?.member?.id === membershipId);

  return (
    <div className="space-y-4">
      {/* User Identity + Private Balance */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{user.name}</h2>
            <p className="text-xs text-text-secondary">{user.phone}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <button
          type="button"
          onClick={() => setBalanceRevealed((v) => !v)}
          className="w-full p-3.5 rounded-token bg-primary-surface border border-primary/25 flex items-center justify-between gap-2 cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            {balance && (
              <StatusDot
                status={
                  balance.status === BalanceStatus.HEALTHY
                    ? 'success'
                    : balance.status === BalanceStatus.WARNING
                      ? 'warning'
                      : 'danger'
                }
              />
            )}
            {balanceRevealed ? (
              <div>
                <span className="text-lg font-extrabold text-text-primary block">
                  {fmt(balance?.currentBalance || '0.00')} {tCommon('bdt')}
                </span>
                <span className="text-xs text-text-secondary">
                  {tLedger('daysLeft')}: {fmt(balance?.daysRemaining ?? 0)}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-primary">{t('tapForBalance')}</span>
            )}
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {balanceRevealed ? t('tapToHide') : '৳'}
          </span>
        </button>

        <p className="text-xs text-text-muted">{t('privacyNote')}</p>

        {/* Mess Switcher & Logout */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {messes.length > 1 && (
              <select
                value={mess.id}
                onChange={(e) => onSelectMess(e.target.value)}
                aria-label={tMess('selectMess')}
                className="h-9 px-2.5 rounded-token border border-border bg-surface text-xs font-semibold text-text-primary cursor-pointer"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" variant="secondary" onClick={onCreateMess}>
              + {tMess('createMess')}
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="text-danger" onClick={onLogout}>
            {tCommon('logout')}
          </Button>
        </div>
      </Card>

      {/* Profile Sub-Section Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant={section === 'ledger' ? 'primary' : 'secondary'}
          onClick={() => setSection('ledger')}
        >
          {t('ownLedger')}
        </Button>
        <Button
          size="sm"
          variant={section === 'grid' ? 'primary' : 'secondary'}
          onClick={() => setSection('grid')}
        >
          {t('ownMealGrid')}
        </Button>
        <Button
          size="sm"
          variant={section === 'defaults' ? 'primary' : 'secondary'}
          onClick={() => setSection('defaults')}
        >
          {t('ownDefaults')}
        </Button>
      </div>

      {/* Private Own Ledger (isManager=false so boarder NEVER sees other members' deposits) */}
      {section === 'ledger' && (
        <LedgerView messId={mess.id} membershipId={membershipId} isManager={false} token={token} />
      )}

      {/* Own Meal Grid */}
      {section === 'grid' && ownHeatmapData && (
        <MealHeatmap
          month={ownHeatmapData.month}
          daysInMonth={ownHeatmapData.daysInMonth}
          rows={ownRows}
        />
      )}

      {/* Own Meal Defaults */}
      {section === 'defaults' && (
        <MealPreferences messId={mess.id} membershipId={membershipId} token={token} />
      )}
    </div>
  );
};

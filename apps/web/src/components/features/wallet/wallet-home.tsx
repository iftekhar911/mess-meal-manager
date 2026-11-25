'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BalanceEvaluationDto,
  BalanceStatus,
  MessDto,
  ShopperDailySummaryDto,
  getDhakaDateString,
  getDhakaTimeString,
  getNextDateString,
  toBengaliDigits
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { StatusDot } from '../../ui/status-dot';

export type WalletScreen =
  | 'home'
  | 'meal-mgmt'
  | 'fard'
  | 'roster'
  | 'grid'
  | 'expenses'
  | 'notices'
  | 'voting'
  | 'swap'
  | 'profile'
  | 'manager';

export interface WalletHomeProps {
  userName: string;
  mess: MessDto;
  balance?: BalanceEvaluationDto;
  tomorrowLunchOn: boolean;
  tomorrowDinnerOn: boolean;
  isTogglingTomorrow: boolean;
  onToggleTomorrowAll: (nextOn: boolean) => void;
  isTodayShopper: boolean;
  shopperSummary?: ShopperDailySummaryDto;
  unreadNoticeCount: number;
  isVotingOpen: boolean;
  onNavigate: (screen: WalletScreen) => void;
}

/**
 * Computes remaining HH:MM until today's cutoff time in Asia/Dhaka.
 */
function getCutoffCountdown(cutoffTime: string): {
  passed: boolean;
  hours: number;
  minutes: number;
} {
  const nowStr = getDhakaTimeString();
  const [nh = 0, nm = 0] = nowStr.split(':').map(Number);
  const [ch = 16, cm = 0] = cutoffTime.split(':').map(Number);
  const nowTotal = nh * 60 + nm;
  const cutTotal = ch * 60 + cm;
  if (nowTotal >= cutTotal) {
    return { passed: true, hours: 0, minutes: 0 };
  }
  const diff = cutTotal - nowTotal;
  return { passed: false, hours: Math.floor(diff / 60), minutes: diff % 60 };
}

/**
 * Wallet-style Boarder Home screen designed for a 10-second daily task:
 * greeting + bell, tap-to-reveal balance, tomorrow card with countdown and
 * one large switch, optional shopping day / auto-off banners, and 2x4 icon grid.
 */
export const WalletHome: React.FC<WalletHomeProps> = ({
  userName,
  mess,
  balance,
  tomorrowLunchOn,
  tomorrowDinnerOn,
  isTogglingTomorrow,
  onToggleTomorrowAll,
  isTodayShopper,
  shopperSummary,
  unreadNoticeCount,
  isVotingOpen,
  onNavigate
}) => {
  const t = useTranslations('wallet');
  const tMeals = useTranslations('meals');
  const tShopper = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const tLedger = useTranslations('ledger');
  const locale = useLocale();

  const [balanceVisible, setBalanceVisible] = useState(false);
  const [countdown, setCountdown] = useState(() => getCutoffCountdown(mess.cutoffTime));

  useEffect(() => {
    setCountdown(getCutoffCountdown(mess.cutoffTime));
    const timer = setInterval(() => {
      setCountdown(getCutoffCountdown(mess.cutoffTime));
    }, 30000);
    return () => clearInterval(timer);
  }, [mess.cutoffTime]);

  useEffect(() => {
    if (!balanceVisible) return;
    const hideTimer = setTimeout(() => setBalanceVisible(false), 6000);
    return () => clearTimeout(hideTimer);
  }, [balanceVisible]);

  const fmt = (v: number | string) => (locale === 'bn' ? toBengaliDigits(v) : String(v));

  const dhakaHour = Number(getDhakaTimeString().slice(0, 2)) || 12;
  const greeting =
    dhakaHour < 12
      ? t('greetingMorning')
      : dhakaHour < 17
        ? t('greetingAfternoon')
        : t('greetingEvening');

  const todayStr = getDhakaDateString();
  const tomorrowStr = getNextDateString(todayStr);
  const isTomorrowAnyOn = tomorrowLunchOn || tomorrowDinnerOn;

  const balanceStatusDot =
    balance?.status === BalanceStatus.HEALTHY
      ? 'success'
      : balance?.status === BalanceStatus.WARNING
        ? 'warning'
        : 'danger';

  const allGridItems: {
    key: WalletScreen;
    label: string;
    visible: boolean;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'meal-mgmt',
      label: t('gridMealMgmt'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
          />
        </svg>
      )
    },
    {
      key: 'fard',
      label: t('gridFard'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      )
    },
    {
      key: 'roster',
      label: t('gridRoster'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )
    },
    {
      key: 'grid',
      label: t('gridMealGrid'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      )
    },
    {
      key: 'expenses',
      label: t('gridExpenses'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      )
    },
    {
      key: 'notices',
      label: t('gridNotices'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      )
    },
    {
      key: 'voting',
      label: t('gridVoting'),
      visible: isVotingOpen,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    },
    {
      key: 'swap',
      label: t('gridSwap'),
      visible: true,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      )
    }
  ];
  const gridItems = allGridItems.filter((item) => item.visible);

  return (
    <div className="space-y-4">
      {/* 1 & 2. Calm Teal Wallet Header: Greeting, Name, Notification Bell + Tap-to-Reveal Balance */}
      <div className="bg-primary text-white rounded-token p-4 sm:p-5 space-y-4 card-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/80">{greeting}</p>
            <h1 className="text-lg sm:text-xl font-bold truncate">{userName}</h1>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('notices')}
            aria-label={t('gridNotices')}
            className="relative w-11 h-11 rounded-token bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNoticeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center">
                {fmt(unreadNoticeCount)}
              </span>
            )}
          </button>
        </div>

        {/* Tap-to-reveal Balance Bar */}
        <button
          type="button"
          onClick={() => setBalanceVisible((v) => !v)}
          className="w-full rounded-token bg-surface text-text-primary px-4 py-3 flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {balance && <StatusDot status={balanceStatusDot} />}
            {balanceVisible ? (
              <div>
                <span className="text-lg font-extrabold text-text-primary block leading-tight">
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
          <span className="text-xs font-semibold text-text-muted shrink-0">
            {balanceVisible ? t('tapToHide') : '৳'}
          </span>
        </button>
      </div>

      {/* Auto-Off Red Banner when balance ran out past grace days */}
      {balance?.isAutoOff && (
        <Card className="bg-danger-surface border-danger/40 space-y-1">
          <h2 className="text-sm font-bold text-danger">{t('autoOffTitle')}</h2>
          <p className="text-xs text-text-secondary">{t('autoOffDesc')}</p>
        </Card>
      )}

      {/* 6. Shopping Day Top Card (only on user's shopping day) */}
      {isTodayShopper && shopperSummary && (
        <Card className="border-primary/40 bg-primary-surface space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-primary">{t('shoppingDayTitle')}</h2>
            <Button size="sm" onClick={() => onNavigate('fard')}>
              {t('openFard')}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-token bg-surface border border-border">
              <span className="text-xs text-text-muted block">{tShopper('totalMeals')}</span>
              <span className="text-base font-bold text-text-primary">
                {fmt(shopperSummary.totalMealUnits)}
              </span>
            </div>
            <div className="p-2 rounded-token bg-surface border border-border">
              <span className="text-xs text-text-muted block">{tShopper('eggTotal')}</span>
              <span className="text-base font-bold text-warning">
                {fmt(shopperSummary.eggCount)}
              </span>
            </div>
            <div className="p-2 rounded-token bg-surface border border-border">
              <span className="text-xs text-text-muted block">{tShopper('budgetRequired')}</span>
              <span className="text-base font-bold text-primary">
                {fmt(shopperSummary.estimatedBudget)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Tomorrow Card: Lunch & Dinner State, Countdown to Cut-off, One Large On/Off Switch */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary">
              {t('tomorrowMeal')}
            </h2>
            <p className="text-xs text-text-secondary">
              {tomorrowStr} ·{' '}
              {countdown.passed
                ? t('cutoffPassed')
                : `${t('cutoffCountdown')} ${fmt(countdown.hours)}h ${fmt(countdown.minutes)}m`}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isTomorrowAnyOn}
            disabled={isTogglingTomorrow || balance?.isAutoOff}
            onClick={() => onToggleTomorrowAll(!isTomorrowAnyOn)}
            className={`w-16 h-9 rounded-full p-1 transition-colors flex items-center cursor-pointer disabled:opacity-50 shrink-0 ${
              isTomorrowAnyOn ? 'bg-success' : 'bg-border-strong'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full bg-white shadow-sm transform transition-transform ${
                isTomorrowAnyOn ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div
            className={`p-3 rounded-token border flex items-center justify-between ${
              tomorrowLunchOn
                ? 'bg-success-surface border-success/30 text-success'
                : 'bg-surface-elevated border-border text-text-secondary'
            }`}
          >
            <span className="text-sm font-semibold">{tMeals('lunch')}</span>
            <span className="text-sm font-bold">
              {tomorrowLunchOn ? tMeals('on') : tMeals('off')}
            </span>
          </div>
          <div
            className={`p-3 rounded-token border flex items-center justify-between ${
              tomorrowDinnerOn
                ? 'bg-success-surface border-success/30 text-success'
                : 'bg-surface-elevated border-border text-text-secondary'
            }`}
          >
            <span className="text-sm font-semibold">{tMeals('dinner')}</span>
            <span className="text-sm font-bold">
              {tomorrowDinnerOn ? tMeals('on') : tMeals('off')}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Icon Grid: 2 Rows x 4 (Bangladeshi Mobile Wallet Pattern) */}
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {gridItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className="flex flex-col items-center justify-start gap-1.5 p-2 rounded-token hover:bg-surface-elevated transition-colors cursor-pointer min-h-[76px]"
            >
              <span className="w-11 h-11 rounded-token bg-primary-surface text-primary flex items-center justify-center shrink-0">
                {item.icon}
              </span>
              <span className="text-xs font-medium text-text-primary text-center leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

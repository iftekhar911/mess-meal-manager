'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateMessSchema,
  CreateMessInput,
  MessDto,
  MembershipDto,
  MembershipRole,
  NoticeDto,
  ProteinType,
  ShopperDailySummaryDto,
  ShoppingRosterDto,
  SlotType,
  EggPreference,
  BalanceStatus,
  BalanceEvaluationDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusDot } from '@/components/ui/status-dot';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { MealHeatmap, HeatmapRow } from '@/components/features/meal-heatmap/meal-heatmap';
import { ShopperSummary } from '@/components/features/shopper-summary/shopper-summary';
import { MealPreferences } from '@/components/features/meal-preferences/meal-preferences';
import { LedgerView } from '@/components/features/ledger/ledger-view';
import { NoticeBoard } from '@/components/features/notices/notice-board';
import { RosterCalendar } from '@/components/features/roster/roster-calendar';
import { ShoppingExpenses } from '@/components/features/expenses/shopping-expenses';
import { MonthStatementView } from '@/components/features/reports/month-statement-view';
import { AuditLogViewer } from '@/components/features/audit/audit-log-viewer';
import { ManagerPanel } from '@/components/features/manager/manager-panel';

type PrimaryTab = 'home' | 'meals' | 'shopping' | 'accounts' | 'more';

export default function HomePage() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tLanding = useTranslations('landing');
  const tOnboard = useTranslations('onboarding');
  const tMess = useTranslations('messes');
  const tMeals = useTranslations('meals');
  const tShopper = useTranslations('shopper');
  const tLedger = useTranslations('ledger');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const {
    user,
    token,
    activeMessId,
    setActiveMessId,
    logout,
    isLoading: isAuthLoading
  } = useAuth();

  const [activeTab, setActiveTab] = useState<PrimaryTab>('home');
  const [mealsSubTab, setMealsSubTab] = useState<'prefs' | 'grid'>('prefs');
  const [accountsSubTab, setAccountsSubTab] = useState<'ledger' | 'reports'>('ledger');
  const [moreSubTab, setMoreSubTab] = useState<'notices' | 'audit' | 'manager'>('notices');
  const [isCreateMessOpen, setIsCreateMessOpen] = useState(false);

  const formatDigit = (val: number | string) =>
    locale === 'bn' ? toBengaliDigits(val) : String(val);

  const todayStr = getDhakaDateString();
  const currentMonth = todayStr.slice(0, 7);

  // 1. User's messes
  const {
    data: messes,
    isLoading: isMessesLoading,
    refetch: refetchMesses
  } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined),
    enabled: !!token
  });

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  // 2. Members of active mess
  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', currentMess?.id],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${currentMess?.id}/members`, {}, token || undefined),
    enabled: !!currentMess?.id
  });

  const currentMembership = members?.find((m) => m.userId === user?.id);
  const isManager = currentMembership?.role === MembershipRole.MANAGER;

  // 3. Heatmap
  const { data: heatmapData } = useQuery<{
    month: string;
    daysInMonth: number;
    rows: HeatmapRow[];
  }>({
    queryKey: ['heatmap', currentMess?.id, currentMonth],
    queryFn: () =>
      apiFetch(
        `/messes/${currentMess?.id}/meals/heatmap?month=${currentMonth}`,
        {},
        token || undefined
      ),
    enabled: !!currentMess?.id
  });

  // 4. Today's shopper summary
  const { data: shopperSummary } = useQuery<ShopperDailySummaryDto>({
    queryKey: ['shopper-summary', currentMess?.id, todayStr],
    queryFn: () =>
      apiFetch<ShopperDailySummaryDto>(
        `/messes/${currentMess?.id}/meals/shopper-summary?date=${todayStr}`,
        {},
        token || undefined
      ),
    enabled: !!currentMess?.id
  });

  // 5. Roster for today's shopper display
  const { data: rosterData } = useQuery<ShoppingRosterDto[]>({
    queryKey: ['roster', currentMess?.id, currentMonth],
    queryFn: () =>
      apiFetch<ShoppingRosterDto[]>(
        `/messes/${currentMess?.id}/roster?month=${currentMonth}`,
        {},
        token || undefined
      ),
    enabled: !!currentMess?.id
  });

  // 6. Real-time balance
  const { data: myBalance } = useQuery<BalanceEvaluationDto>({
    queryKey: ['my-balance', currentMess?.id, currentMembership?.id],
    queryFn: () =>
      apiFetch<BalanceEvaluationDto>(
        `/messes/${currentMess?.id}/ledger/balance/${currentMembership?.id}`,
        {},
        token || undefined
      ),
    enabled: !!currentMess?.id && !!currentMembership?.id
  });

  // 7. Latest notices
  const { data: notices } = useQuery<NoticeDto[]>({
    queryKey: ['notices', currentMess?.id],
    queryFn: () =>
      apiFetch<NoticeDto[]>(`/messes/${currentMess?.id}/notices`, {}, token || undefined),
    enabled: !!currentMess?.id
  });

  // Quick one-tap toggle for Today's Lunch or Dinner right on Home
  const quickSlotMutation = useMutation({
    mutationFn: ({ slot, status }: { slot: SlotType; status: boolean }) =>
      apiFetch(
        `/messes/${currentMess?.id}/meals/override/${currentMembership?.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: todayStr,
            slot,
            status,
            eggPreference: EggPreference.NONE,
            guestCount: 0
          })
        },
        token || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateMessInput>({
    resolver: zodResolver(CreateMessSchema),
    defaultValues: {
      name: '',
      cutoffTime: '22:00:00',
      mealRate: 50.0,
      graceDays: 3,
      warningDays: 2,
      shoppersPerDay: 2,
      shopTimesPerMonth: 2
    }
  });

  const createMessMutation = useMutation({
    mutationFn: (newMess: CreateMessInput) =>
      apiFetch<MessDto>(
        '/messes',
        { method: 'POST', body: JSON.stringify(newMess) },
        token || undefined
      ),
    onSuccess: (savedMess) => {
      queryClient.invalidateQueries({ queryKey: ['my-messes'] });
      setActiveMessId(savedMess.id);
      setIsCreateMessOpen(false);
      reset();
    }
  });

  const getProteinLabel = (protein?: ProteinType) => {
    if (protein === ProteinType.FISH) return tShopper('proteinFish');
    if (protein === ProteinType.CHICKEN) return tShopper('proteinChicken');
    return tShopper('proteinOther');
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary mt-1">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Landing Page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
        <div className="fixed top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-token bg-primary text-white shadow-sm">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {tCommon('appName')}
            </h1>
            <p className="text-base sm:text-lg text-text-secondary max-w-lg mx-auto leading-relaxed">
              {tCommon('tagline')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 max-w-sm mx-auto">
              <Link href="/login" className="flex-1">
                <Button size="lg" className="w-full font-bold">
                  {tAuth('loginButton')}
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="secondary" size="lg" className="w-full font-semibold">
                  {tAuth('registerButton')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Card className="p-5 space-y-2">
              <h2 className="font-bold text-base text-text-primary">{tLanding('feature1Title')}</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {tLanding('feature1Desc')}
              </p>
            </Card>
            <Card className="p-5 space-y-2">
              <h2 className="font-bold text-base text-text-primary">{tLanding('feature2Title')}</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {tLanding('feature2Desc')}
              </p>
            </Card>
            <Card className="p-5 space-y-2">
              <h2 className="font-bold text-base text-text-primary">{tLanding('feature3Title')}</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {tLanding('feature3Desc')}
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const userHeatmapRow = heatmapData?.rows?.find((r) => r?.member?.id === currentMembership?.id);
  const todayCell = userHeatmapRow?.days?.[todayStr];
  const isLunchOn = todayCell?.lunch ?? true;
  const isDinnerOn = todayCell?.dinner ?? true;
  const todayShoppers = (rosterData || []).filter((r) => r.date === todayStr);
  const isTodayShopper = todayShoppers.some((s) => s.membershipId === currentMembership?.id);
  const latestNotice = notices?.[0];

  const navItems: { key: PrimaryTab; label: string }[] = [
    { key: 'home', label: tNav('home') },
    { key: 'meals', label: tNav('meals') },
    { key: 'shopping', label: tNav('shopping') },
    { key: 'accounts', label: tNav('accounts') },
    { key: 'more', label: tNav('more') }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 md:pb-8">
      {/* Compact Responsive Top Bar (Zero Overflow on 375px) */}
      <header className="border-b border-border bg-surface/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-token bg-primary text-white flex items-center justify-center font-bold text-sm">
              M
            </span>

            {messes && messes.length > 1 ? (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                aria-label={tMess('selectMess')}
                className="text-xs sm:text-sm font-bold bg-surface-elevated text-text-primary border border-border px-2.5 py-1.5 rounded-token max-w-[130px] sm:max-w-[200px] truncate cursor-pointer"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : currentMess ? (
              <span className="text-xs sm:text-sm font-bold text-text-primary truncate max-w-[130px] sm:max-w-[220px]">
                {currentMess.name}
              </span>
            ) : (
              <span className="text-sm font-bold text-text-primary truncate">
                {tCommon('appName')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {myBalance && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('accounts');
                  setAccountsSubTab('ledger');
                }}
                className="flex items-center gap-1.5 bg-surface-elevated border border-border px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer hover:border-primary/50"
              >
                <StatusDot
                  status={
                    myBalance.status === BalanceStatus.HEALTHY
                      ? 'success'
                      : myBalance.status === BalanceStatus.WARNING
                        ? 'warning'
                        : 'danger'
                  }
                />
                <span>{formatDigit(myBalance.currentBalance)}</span>
              </button>
            )}

            <LanguageSwitcher />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-xs px-2 h-8 sm:h-9"
            >
              {tCommon('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Top Navigation Bar */}
      {currentMess && (
        <nav className="hidden md:block border-b border-border bg-surface">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === item.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setIsCreateMessOpen(true)}>
              + {tMess('createMess')}
            </Button>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        {isMessesLoading ? (
          <p className="text-center text-sm text-text-secondary py-12">{tCommon('loading')}</p>
        ) : !messes || messes.length === 0 ? (
          /* Zero-Fake-Data Onboarding */
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                {tOnboard('welcome')}, {user.name}
              </h1>
              <p className="text-sm sm:text-base text-text-secondary">{tOnboard('subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-text-primary">{tOnboard('createTitle')}</h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {tOnboard('createDesc')}
                  </p>
                </div>
                <Button className="w-full" onClick={() => setIsCreateMessOpen(true)}>
                  + {tMess('createButton')}
                </Button>
              </Card>

              <Card className="p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-text-primary">{tOnboard('joinTitle')}</h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {tOnboard('joinDesc')}
                  </p>
                  <div className="p-3 rounded-token bg-surface-elevated border border-border text-center">
                    <span className="text-xs text-text-muted block">{tOnboard('yourPhone')}</span>
                    <span className="text-lg font-extrabold text-primary">{user.phone}</span>
                  </div>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => refetchMesses()}>
                  {tCommon('refresh')}
                </Button>
              </Card>
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: HOME (TODAY AT A GLANCE) */}
            {activeTab === 'home' && currentMess && currentMembership && (
              <div className="space-y-4">
                {/* Today's Meal Hero Card */}
                <Card className="p-5 sm:p-6 space-y-4 border-primary/25">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-text-primary">
                        {tMeals('todayMealStatus')}
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {tMeals('quickToggleHint')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-text-secondary">
                      {todayStr}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={quickSlotMutation.isPending}
                      onClick={() =>
                        quickSlotMutation.mutate({ slot: SlotType.LUNCH, status: !isLunchOn })
                      }
                      className={`p-4 rounded-token border-2 text-left transition-all cursor-pointer ${
                        isLunchOn
                          ? 'border-success bg-success-surface text-success'
                          : 'border-border bg-surface-elevated/60 text-text-secondary'
                      }`}
                    >
                      <span className="text-xs font-semibold block">{tMeals('lunch')}</span>
                      <span className="text-2xl font-extrabold mt-1 block">
                        {isLunchOn ? tMeals('on') : tMeals('off')}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={quickSlotMutation.isPending}
                      onClick={() =>
                        quickSlotMutation.mutate({ slot: SlotType.DINNER, status: !isDinnerOn })
                      }
                      className={`p-4 rounded-token border-2 text-left transition-all cursor-pointer ${
                        isDinnerOn
                          ? 'border-success bg-success-surface text-success'
                          : 'border-border bg-surface-elevated/60 text-text-secondary'
                      }`}
                    >
                      <span className="text-xs font-semibold block">{tMeals('dinner')}</span>
                      <span className="text-2xl font-extrabold mt-1 block">
                        {isDinnerOn ? tMeals('on') : tMeals('off')}
                      </span>
                    </button>
                  </div>
                </Card>

                {/* Balance + Menu Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        {tLedger('balance')}
                      </span>
                      <span className="text-xs font-semibold text-text-muted">
                        {tMess('cutoffTime')}: {currentMess.cutoffTime}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-text-primary">
                        {formatDigit(myBalance?.currentBalance || '0.00')}
                      </span>
                      <span className="text-sm font-semibold text-text-muted">
                        {tCommon('bdt')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-text-secondary font-medium">
                        {tLedger('daysLeft')}: {formatDigit(myBalance?.daysRemaining ?? 0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('accounts')}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        {tNav('ledger')} &rarr;
                      </button>
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        {tShopper('todayMenu')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('shopping')}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        {tNav('shopping')} &rarr;
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-token bg-surface-elevated/60 border border-border">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-text-secondary">
                            {tShopper('lunchMenu')}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-surface text-primary">
                            {getProteinLabel(
                              shopperSummary?.menu?.lunchProtein || shopperSummary?.menu?.protein
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                          {shopperSummary?.menu?.lunchNote ||
                            shopperSummary?.menu?.note ||
                            tShopper('noMenuSet')}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-token bg-surface-elevated/60 border border-border">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-text-secondary">
                            {tShopper('dinnerMenu')}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-surface text-primary">
                            {getProteinLabel(shopperSummary?.menu?.dinnerProtein)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                          {shopperSummary?.menu?.dinnerNote || tShopper('noMenuSet')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs text-text-secondary">
                      <span>
                        {tShopper('dutyShopper')}:{' '}
                        <strong className="text-text-primary">
                          {todayShoppers.length > 0
                            ? todayShoppers.map((s) => s.member?.user?.name).join(', ')
                            : tShopper('noShopperAssigned')}
                        </strong>
                      </span>
                      <span>
                        {tShopper('eggTotal')}:{' '}
                        <strong className="text-warning">
                          {formatDigit(shopperSummary?.eggCount ?? 0)}
                        </strong>
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Latest Notice Preview */}
                {latestNotice && (
                  <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary-surface/40 border-primary/20">
                    <div>
                      <span className="text-xs font-bold text-primary block">
                        {tNav('notices')}
                      </span>
                      <h3 className="font-bold text-sm text-text-primary mt-0.5">
                        {latestNotice.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {latestNotice.body}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActiveTab('more');
                        setMoreSubTab('notices');
                      }}
                    >
                      {tCommon('all')}
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 2: MEALS (PREFERENCES + MONTHLY GRID) */}
            {activeTab === 'meals' && currentMess && currentMembership && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={mealsSubTab === 'prefs' ? 'primary' : 'secondary'}
                    onClick={() => setMealsSubTab('prefs')}
                  >
                    {tMeals('title')}
                  </Button>
                  <Button
                    size="sm"
                    variant={mealsSubTab === 'grid' ? 'primary' : 'secondary'}
                    onClick={() => setMealsSubTab('grid')}
                  >
                    {tNav('heatmap')}
                  </Button>
                </div>

                {mealsSubTab === 'prefs' ? (
                  <MealPreferences
                    messId={currentMess.id}
                    membershipId={currentMembership.id}
                    token={token || undefined}
                  />
                ) : heatmapData ? (
                  <MealHeatmap
                    month={heatmapData.month}
                    daysInMonth={heatmapData.daysInMonth}
                    rows={heatmapData.rows}
                  />
                ) : (
                  <p className="text-sm text-text-secondary py-6 text-center">
                    {tCommon('loading')}
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: SHOPPING */}
            {activeTab === 'shopping' && currentMess && currentMembership && (
              <div className="space-y-5">
                {shopperSummary && (
                  <ShopperSummary
                    summary={shopperSummary}
                    token={token || undefined}
                    isShopperOrManager={isManager || isTodayShopper}
                  />
                )}
                <RosterCalendar
                  messId={currentMess.id}
                  membershipId={currentMembership.id}
                  isManager={isManager}
                  shoppersPerDay={currentMess.shoppersPerDay}
                  token={token || undefined}
                />
                <ShoppingExpenses
                  messId={currentMess.id}
                  isManager={isManager}
                  token={token || undefined}
                />
              </div>
            )}

            {/* TAB 4: ACCOUNTS (LEDGER + MONTHLY CLOSE) */}
            {activeTab === 'accounts' && currentMess && currentMembership && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={accountsSubTab === 'ledger' ? 'primary' : 'secondary'}
                    onClick={() => setAccountsSubTab('ledger')}
                  >
                    {tNav('ledger')}
                  </Button>
                  <Button
                    size="sm"
                    variant={accountsSubTab === 'reports' ? 'primary' : 'secondary'}
                    onClick={() => setAccountsSubTab('reports')}
                  >
                    {tNav('reports')}
                  </Button>
                </div>

                {accountsSubTab === 'ledger' ? (
                  <LedgerView
                    messId={currentMess.id}
                    membershipId={currentMembership.id}
                    isManager={isManager}
                    token={token || undefined}
                  />
                ) : (
                  <MonthStatementView
                    messId={currentMess.id}
                    isManager={isManager}
                    token={token || undefined}
                  />
                )}
              </div>
            )}

            {/* TAB 5: MORE (NOTICES + AUDIT + MANAGER + NEW MESS) */}
            {activeTab === 'more' && currentMess && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={moreSubTab === 'notices' ? 'primary' : 'secondary'}
                      onClick={() => setMoreSubTab('notices')}
                    >
                      {tNav('notices')}
                    </Button>
                    <Button
                      size="sm"
                      variant={moreSubTab === 'audit' ? 'primary' : 'secondary'}
                      onClick={() => setMoreSubTab('audit')}
                    >
                      {tNav('audit')}
                    </Button>
                    {isManager && (
                      <Button
                        size="sm"
                        variant={moreSubTab === 'manager' ? 'primary' : 'secondary'}
                        onClick={() => setMoreSubTab('manager')}
                      >
                        {tNav('manager')}
                      </Button>
                    )}
                  </div>

                  <Button size="sm" variant="secondary" onClick={() => setIsCreateMessOpen(true)}>
                    + {tMess('createMess')}
                  </Button>
                </div>

                {moreSubTab === 'notices' && (
                  <NoticeBoard
                    messId={currentMess.id}
                    isManager={isManager}
                    token={token || undefined}
                  />
                )}

                {moreSubTab === 'audit' && (
                  <AuditLogViewer messId={currentMess.id} token={token || undefined} />
                )}

                {moreSubTab === 'manager' && (
                  <ManagerPanel
                    messId={currentMess.id}
                    isManager={isManager}
                    token={token || undefined}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Create Mess Modal */}
        <Modal
          isOpen={isCreateMessOpen}
          onClose={() => setIsCreateMessOpen(false)}
          title={tMess('createMess')}
        >
          <form
            onSubmit={handleSubmit((data) => createMessMutation.mutate(data))}
            className="space-y-4"
          >
            <Input
              label={tMess('messName')}
              placeholder={tMess('messNamePlaceholder')}
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={tMess('cutoffTime')}
                placeholder="22:00:00"
                error={errors.cutoffTime?.message}
                {...register('cutoffTime')}
              />
              <Input
                label={tMess('mealRate')}
                type="number"
                step="0.5"
                error={errors.mealRate?.message}
                {...register('mealRate', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={tMess('graceDays')}
                type="number"
                error={errors.graceDays?.message}
                {...register('graceDays', { valueAsNumber: true })}
              />
              <Input
                label={tMess('warningDays')}
                type="number"
                error={errors.warningDays?.message}
                {...register('warningDays', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={tMess('shoppersPerDay')}
                type="number"
                error={errors.shoppersPerDay?.message}
                {...register('shoppersPerDay', { valueAsNumber: true })}
              />
              <Input
                label={tMess('shopTimesPerMonth')}
                type="number"
                error={errors.shopTimesPerMonth?.message}
                {...register('shopTimesPerMonth', { valueAsNumber: true })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCreateMessOpen(false)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                size="sm"
                type="submit"
                isLoading={isSubmitting || createMessMutation.isPending}
              >
                {tMess('createButton')}
              </Button>
            </div>
          </form>
        </Modal>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (5 clean equal tabs, zero overflow) */}
      {currentMess && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-1 py-1.5 no-print">
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`flex flex-col items-center justify-center py-2 rounded-token text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'bg-primary-surface text-primary font-bold' : 'text-text-secondary'
                  }`}
                >
                  <span className="truncate max-w-full px-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  ShopperDailySummaryDto,
  ShoppingRosterDto,
  SlotType,
  EggPreference,
  BalanceEvaluationDto,
  getDhakaDateString,
  getNextDateString
} from '@mess/shared';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { MealHeatmap, HeatmapRow } from '@/components/features/meal-heatmap/meal-heatmap';
import { NoticeBoard } from '@/components/features/notices/notice-board';
import { RosterCalendar } from '@/components/features/roster/roster-calendar';
import { ShoppingExpenses } from '@/components/features/expenses/shopping-expenses';
import { MessDirectoryGrid } from '@/components/features/mess-directory/mess-directory-grid';
import { WalletHome, WalletScreen } from '@/components/features/wallet/wallet-home';
import { FardView } from '@/components/features/wallet/fard-view';
import { MealManagementScreen } from '@/components/features/wallet/meal-management-screen';
import { SwapRequestScreen, VotingScreen } from '@/components/features/wallet/swap-and-voting';
import { ProfileScreen } from '@/components/features/wallet/profile-screen';
import { ManagerArea } from '@/components/features/wallet/manager-area';

const SEEN_NOTICES_KEY = 'mm_seen_notice_count';

export default function HomePage() {
  const tCommon = useTranslations('common');
  const tWallet = useTranslations('wallet');
  const tLanding = useTranslations('landing');
  const tOnboard = useTranslations('onboarding');
  const tMess = useTranslations('messes');
  const tAuth = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const queryClient = useQueryClient();

  const {
    user,
    token,
    activeMessId,
    setActiveMessId,
    logout,
    isLoading: isAuthLoading,
    apiUnreachable,
    retrySession
  } = useAuth();

  const [screen, setScreen] = useState<WalletScreen>('home');
  const [isCreateMessOpen, setIsCreateMessOpen] = useState(false);
  const [seenNoticeCount, setSeenNoticeCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem(SEEN_NOTICES_KEY) || 0);
      setSeenNoticeCount(saved);
    }
  }, []);

  const todayStr = getDhakaDateString();
  const tomorrowStr = getNextDateString(todayStr);
  const currentMonth = todayStr.slice(0, 7);
  const tomorrowMonth = tomorrowStr.slice(0, 7);
  const dayOfMonth = Number(todayStr.slice(8, 10)) || 1;
  const isVotingOpen = dayOfMonth >= 25;

  // Queries
  const {
    data: messes,
    isLoading: isMessesLoading,
    isError: isMessesError,
    refetch: refetchMesses
  } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined),
    enabled: !!token
  });

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', currentMess?.id],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${currentMess?.id}/members`, {}, token || undefined),
    enabled: !!currentMess?.id
  });

  const currentMembership = members?.find((m) => m.userId === user?.id);
  const isManager = currentMembership?.role === MembershipRole.MANAGER;

  const { data: heatmapData } = useQuery<{
    month: string;
    daysInMonth: number;
    rows: HeatmapRow[];
  }>({
    queryKey: ['heatmap', currentMess?.id, tomorrowMonth],
    queryFn: () =>
      apiFetch(
        `/messes/${currentMess?.id}/meals/heatmap?month=${tomorrowMonth}`,
        {},
        token || undefined
      ),
    enabled: !!currentMess?.id
  });

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

  const { data: notices } = useQuery<NoticeDto[]>({
    queryKey: ['notices', currentMess?.id],
    queryFn: () =>
      apiFetch<NoticeDto[]>(`/messes/${currentMess?.id}/notices`, {}, token || undefined),
    enabled: !!currentMess?.id
  });

  const unreadNoticeCount = Math.max(0, (notices?.length || 0) - seenNoticeCount);

  const navigateTo = (target: WalletScreen) => {
    if (target === 'notices' && notices) {
      setSeenNoticeCount(notices.length);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SEEN_NOTICES_KEY, String(notices.length));
      }
    }
    setScreen(target);
  };

  // One-tap toggle for tomorrow's lunch + dinner from Home
  const toggleTomorrowMutation = useMutation({
    mutationFn: async (nextOn: boolean) => {
      await Promise.all([
        apiFetch(
          `/messes/${currentMess?.id}/meals/override/${currentMembership?.id}`,
          {
            method: 'POST',
            body: JSON.stringify({
              date: tomorrowStr,
              slot: SlotType.LUNCH,
              status: nextOn,
              eggPreference: EggPreference.NONE,
              guestCount: 0
            })
          },
          token || undefined
        ),
        apiFetch(
          `/messes/${currentMess?.id}/meals/override/${currentMembership?.id}`,
          {
            method: 'POST',
            body: JSON.stringify({
              date: tomorrowStr,
              slot: SlotType.DINNER,
              status: nextOn,
              eggPreference: EggPreference.NONE,
              guestCount: 0
            })
          },
          token || undefined
        )
      ]);
    },
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
      cutoffTime: '16:00:00',
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
      queryClient.invalidateQueries({ queryKey: ['mess-directory'] });
      setActiveMessId(savedMess.id);
      setIsCreateMessOpen(false);
      reset();
    }
  });

  // Brief bounded loading state (max 5s timeout enforced in AuthProvider)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Landing / Login Entry (also shown cleanly if API was unreachable)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-background">
        <div className="fixed top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-xl space-y-6">
          {apiUnreachable && (
            <Card className="bg-warning-surface border-warning/40 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-primary">{tErrors('networkError')}</p>
              <Button size="sm" variant="secondary" onClick={() => retrySession()}>
                {tCommon('refresh')}
              </Button>
            </Card>
          )}

          <div className="text-center space-y-3">
            <h1 className="text-3xl font-extrabold text-text-primary">{tCommon('appName')}</h1>
            <p className="text-base text-text-secondary max-w-md mx-auto">{tCommon('tagline')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 max-w-sm mx-auto">
              <Link href="/login" className="flex-1">
                <Button size="lg" className="w-full">
                  {tAuth('loginButton')}
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="secondary" size="lg" className="w-full">
                  {tAuth('registerButton')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 space-y-1">
              <h2 className="font-bold text-sm text-text-primary">{tLanding('feature1Title')}</h2>
              <p className="text-xs text-text-secondary">{tLanding('feature1Desc')}</p>
            </Card>
            <Card className="p-4 space-y-1">
              <h2 className="font-bold text-sm text-text-primary">{tLanding('feature2Title')}</h2>
              <p className="text-xs text-text-secondary">{tLanding('feature2Desc')}</p>
            </Card>
            <Card className="p-4 space-y-1">
              <h2 className="font-bold text-sm text-text-primary">{tLanding('feature3Title')}</h2>
              <p className="text-xs text-text-secondary">{tLanding('feature3Desc')}</p>
            </Card>
          </div>

          <div className="pt-4 border-t border-border">
            <MessDirectoryGrid isLoggedIn={false} />
          </div>
        </div>
      </div>
    );
  }

  const userHeatmapRow = heatmapData?.rows?.find((r) => r?.member?.id === currentMembership?.id);
  const tomorrowCell = userHeatmapRow?.days?.[tomorrowStr];
  const tomorrowLunchOn = tomorrowCell ? tomorrowCell.lunch : true;
  const tomorrowDinnerOn = tomorrowCell ? tomorrowCell.dinner : true;
  const todayShoppers = (rosterData || []).filter((r) => r.date === todayStr);
  const isTodayShopper = todayShoppers.some((s) => s.membershipId === currentMembership?.id);

  const screenTitles: Record<WalletScreen, string> = {
    home: currentMess?.name || tCommon('appName'),
    'meal-mgmt': tWallet('gridMealMgmt'),
    fard: tWallet('fardTitle'),
    roster: tWallet('gridRoster'),
    grid: tWallet('gridMealGrid'),
    expenses: tWallet('gridExpenses'),
    notices: tWallet('gridNotices'),
    voting: tWallet('votingTitle'),
    swap: tWallet('swapTitle'),
    profile: tWallet('profileTitle'),
    manager: tWallet('tabManager')
  };

  return (
    <div className="min-h-screen bg-background text-text-primary pb-24">
      {/* Compact Top Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-border px-3 py-2.5 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {screen !== 'home' && currentMess && (
              <Button size="sm" variant="ghost" onClick={() => navigateTo('home')} className="px-2">
                &larr; {tCommon('back')}
              </Button>
            )}
            <span className="font-bold text-sm sm:text-base text-text-primary truncate">
              {screenTitles[screen]}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isManager && currentMess && (
              <Button
                size="sm"
                variant={screen === 'manager' ? 'primary' : 'secondary'}
                onClick={() => navigateTo(screen === 'manager' ? 'home' : 'manager')}
              >
                {tWallet('tabManager')}
              </Button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content Container (Clean Mobile-Wallet Width) */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {isMessesError ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-danger font-medium">{tErrors('networkError')}</p>
            <Button size="sm" onClick={() => refetchMesses()}>
              {tCommon('refresh')}
            </Button>
          </Card>
        ) : isMessesLoading ? (
          <p className="text-center text-sm text-text-secondary py-12">{tCommon('loading')}</p>
        ) : !messes || messes.length === 0 ? (
          /* First-Page Mess Directory Grid + Create Mess */
          <div className="space-y-5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h1 className="text-xl font-bold text-text-primary">
                  {tOnboard('welcome')}, {user.name}
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  {tOnboard('subtitle')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => refetchMesses()}>
                  {tCommon('refresh')}
                </Button>
                <Button size="sm" onClick={() => setIsCreateMessOpen(true)}>
                  + {tMess('createButton')}
                </Button>
              </div>
            </div>

            <MessDirectoryGrid
              token={token}
              isLoggedIn={true}
              onSelectMess={(id) => {
                setActiveMessId(id);
                refetchMesses();
              }}
              onCreateNew={() => setIsCreateMessOpen(true)}
            />
          </div>
        ) : currentMess && currentMembership ? (
          <>
            {screen === 'home' && (
              <WalletHome
                userName={user.name}
                mess={currentMess}
                balance={myBalance}
                tomorrowLunchOn={tomorrowLunchOn}
                tomorrowDinnerOn={tomorrowDinnerOn}
                isTogglingTomorrow={toggleTomorrowMutation.isPending}
                onToggleTomorrowAll={(nextOn) => toggleTomorrowMutation.mutate(nextOn)}
                isTodayShopper={isTodayShopper}
                shopperSummary={shopperSummary}
                unreadNoticeCount={unreadNoticeCount}
                isVotingOpen={isVotingOpen}
                onNavigate={navigateTo}
              />
            )}

            {screen === 'meal-mgmt' && (
              <MealManagementScreen
                messId={currentMess.id}
                membershipId={currentMembership.id}
                tomorrowLunchOn={tomorrowLunchOn}
                tomorrowDinnerOn={tomorrowDinnerOn}
                isAutoOff={myBalance?.isAutoOff}
                token={token || undefined}
              />
            )}

            {screen === 'fard' && (
              <FardView
                messId={currentMess.id}
                summary={shopperSummary}
                canEdit={isManager || isTodayShopper}
                token={token || undefined}
              />
            )}

            {screen === 'roster' && (
              <RosterCalendar
                messId={currentMess.id}
                membershipId={currentMembership.id}
                isManager={isManager}
                shoppersPerDay={currentMess.shoppersPerDay}
                token={token || undefined}
              />
            )}

            {screen === 'grid' &&
              (heatmapData ? (
                <MealHeatmap
                  month={heatmapData.month}
                  daysInMonth={heatmapData.daysInMonth}
                  rows={heatmapData.rows}
                />
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center">{tCommon('loading')}</p>
              ))}

            {screen === 'expenses' && (
              <ShoppingExpenses
                messId={currentMess.id}
                isManager={isManager}
                token={token || undefined}
              />
            )}

            {screen === 'notices' && (
              <NoticeBoard
                messId={currentMess.id}
                isManager={isManager}
                token={token || undefined}
              />
            )}

            {screen === 'voting' && (
              <VotingScreen
                messId={currentMess.id}
                membershipId={currentMembership.id}
                isVotingOpen={isVotingOpen}
                token={token || undefined}
              />
            )}

            {screen === 'swap' && (
              <SwapRequestScreen
                messId={currentMess.id}
                membershipId={currentMembership.id}
                token={token || undefined}
              />
            )}

            {screen === 'profile' && (
              <ProfileScreen
                user={user}
                mess={currentMess}
                messes={messes}
                membershipId={currentMembership.id}
                balance={myBalance}
                ownHeatmapData={heatmapData}
                token={token || undefined}
                onSelectMess={(id) => {
                  setActiveMessId(id);
                  setScreen('home');
                }}
                onCreateMess={() => setIsCreateMessOpen(true)}
                onLogout={() => logout()}
              />
            )}

            {screen === 'manager' && isManager && (
              <ManagerArea
                messId={currentMess.id}
                membershipId={currentMembership.id}
                token={token || undefined}
              />
            )}
          </>
        ) : null}

        {/* Create Mess Modal (Default cutoff 16:00:00, graceDays allows 0) */}
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
                placeholder="16:00:00"
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
                min="0"
                error={errors.graceDays?.message}
                {...register('graceDays', { valueAsNumber: true })}
              />
              <Input
                label={tMess('warningDays')}
                type="number"
                min="0"
                error={errors.warningDays?.message}
                {...register('warningDays', { valueAsNumber: true })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={tMess('shoppersPerDay')}
                type="number"
                min="1"
                error={errors.shoppersPerDay?.message}
                {...register('shoppersPerDay', { valueAsNumber: true })}
              />
              <Input
                label={tMess('shopTimesPerMonth')}
                type="number"
                min="1"
                error={errors.shopTimesPerMonth?.message}
                {...register('shopTimesPerMonth', { valueAsNumber: true })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
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

      {/* 5-Item Wallet Bottom Tabs with Large Center Button (Tomorrow's Meal) */}
      {currentMess && currentMembership && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-2 py-1.5 no-print">
          <div className="max-w-2xl mx-auto grid grid-cols-5 items-end gap-1">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-token text-xs font-semibold cursor-pointer ${
                screen === 'home' ? 'text-primary font-bold' : 'text-text-secondary'
              }`}
            >
              <svg
                className="w-5 h-5 mb-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>{tWallet('tabHome')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('grid')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-token text-xs font-semibold cursor-pointer ${
                screen === 'grid' ? 'text-primary font-bold' : 'text-text-secondary'
              }`}
            >
              <svg
                className="w-5 h-5 mb-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>{tWallet('tabGrid')}</span>
            </button>

            {/* Large Center Button: Tomorrow's Meal */}
            <button
              type="button"
              onClick={() => navigateTo('meal-mgmt')}
              className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
            >
              <span
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md border-4 border-surface transition-colors ${
                  screen === 'meal-mgmt'
                    ? 'bg-primary-hover text-white'
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                  />
                </svg>
              </span>
              <span
                className={`text-xs font-bold mt-0.5 ${
                  screen === 'meal-mgmt' ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {tWallet('tomorrowTab')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notices')}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-token text-xs font-semibold cursor-pointer ${
                screen === 'notices' ? 'text-primary font-bold' : 'text-text-secondary'
              }`}
            >
              <svg
                className="w-5 h-5 mb-0.5"
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
              <span>{tWallet('tabNotices')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-token text-xs font-semibold cursor-pointer ${
                screen === 'profile' ? 'text-primary font-bold' : 'text-text-secondary'
              }`}
            >
              <svg
                className="w-5 h-5 mb-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>{tWallet('tabProfile')}</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

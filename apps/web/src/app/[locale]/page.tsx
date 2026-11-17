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
  ShopperDailySummaryDto,
  BalanceStatus,
  BalanceEvaluationDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { StatusDot } from '@/components/ui/status-dot';
import { PageHeader } from '@/components/ui/page-header';
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
import { Tabs } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/routing';

export default function HomePage() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tMess = useTranslations('messes');
  const tMeals = useTranslations('meals');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    user,
    token,
    activeMessId,
    setActiveMessId,
    logout,
    isLoading: isAuthLoading
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'meals' | 'heatmap' | 'shopper' | 'ledger' | 'reports' | 'notices' | 'audit' | 'manager'
  >('meals');
  const [isCreateMessOpen, setIsCreateMessOpen] = useState(false);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  // Fetch messes for user
  const { data: messes, isLoading: isMessesLoading } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined),
    enabled: !!token
  });

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  // Fetch user's membership in active mess
  const { data: members } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', currentMess?.id],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${currentMess?.id}/members`, {}, token || undefined),
    enabled: !!currentMess?.id
  });

  const currentMembership = members?.find((m) => m.userId === user?.id) || members?.[0];
  const isManager = currentMembership?.role === 'MANAGER';

  // Fetch heatmap for active mess
  const currentMonth = getDhakaDateString().slice(0, 7);
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
    enabled: !!currentMess?.id && (activeTab === 'heatmap' || activeTab === 'meals')
  });

  // Fetch shopper summary
  const todayStr = getDhakaDateString();
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

  // Fetch real-time balance for user
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
        {
          method: 'POST',
          body: JSON.stringify(newMess)
        },
        token || undefined
      ),
    onSuccess: (savedMess) => {
      queryClient.invalidateQueries({ queryKey: ['my-messes'] });
      setActiveMessId(savedMess.id);
      setIsCreateMessOpen(false);
      reset();
    }
  });

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary mt-2">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Welcome Portal
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-surface text-primary border border-primary/20 shadow-xs">
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

          <div>
            <h1 className="text-3xl font-extrabold text-text-primary">{tCommon('appName')}</h1>
            <p className="text-base text-text-secondary mt-2 leading-relaxed">
              {tAuth('loginSubtitle')}
            </p>
          </div>

          <Card className="p-6 space-y-4 card-shadow">
            <Button
              onClick={() => router.push('/login')}
              size="lg"
              className="w-full font-bold shadow-sm"
            >
              {tAuth('loginButton')}
            </Button>
            <Button
              onClick={() => router.push('/register')}
              variant="secondary"
              size="lg"
              className="w-full font-semibold"
            >
              {tAuth('registerButton')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Today's meal row for current user in heatmap
  const userHeatmapRow = heatmapData?.rows?.find((r) => r.member.id === currentMembership?.id);
  const todayCell = userHeatmapRow?.days?.[todayStr];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Top Header */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-md px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Mess Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
                M
              </span>
              <span className="font-extrabold text-base sm:text-lg text-text-primary hidden sm:inline">
                {tCommon('appName')}
              </span>
            </div>

            {messes && messes.length > 1 ? (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                aria-label={tMess('selectMess')}
                className="text-xs font-semibold bg-surface-elevated text-text-primary border border-border px-2.5 py-1.5 rounded-token focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : currentMess ? (
              <span className="text-xs font-semibold bg-surface-elevated text-text-secondary border border-border px-2.5 py-1 rounded-token">
                {currentMess.name}
              </span>
            ) : null}
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Balance Pill */}
            {myBalance && (
              <div
                onClick={() => setActiveTab('ledger')}
                className="flex items-center gap-1.5 bg-surface-elevated/80 border border-border px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer hover:border-primary/50 transition-colors"
                title={`${tNav('ledger')}: ${myBalance.currentBalance} ${tCommon('bdt')}`}
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
                <span className="font-extrabold text-text-primary">
                  {formatDigit(myBalance.currentBalance)} {tCommon('bdt')}
                </span>
              </div>
            )}

            {isManager && (
              <Button
                variant={activeTab === 'manager' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveTab('manager')}
                className="hidden md:inline-flex text-xs font-semibold"
              >
                {tNav('manager')}
              </Button>
            )}

            <LanguageSwitcher />

            <div className="flex items-center gap-2 pl-1 border-l border-border">
              <Avatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                size="sm"
                status={myBalance?.status}
              />
              <span className="text-xs font-semibold text-text-secondary hidden lg:inline max-w-[120px] truncate">
                {user.name}
              </span>
              <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs px-2">
                {tCommon('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Page Title & New Mess Action */}
        <PageHeader
          title={currentMess ? currentMess.name : tMess('selectMess')}
          subtitle={
            currentMess ? `${tMess('cutoffTime')}: ${currentMess.cutoffTime}` : tMess('createMess')
          }
          action={
            <Button onClick={() => setIsCreateMessOpen(true)} size="sm">
              + {tMess('createMess')}
            </Button>
          }
        />

        {/* Today at a Glance Summary Bar */}
        {currentMess && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Today Dhaka Date */}
            <Card className="p-3.5 card-shadow flex items-center justify-between">
              <div>
                <span className="text-2xs text-text-muted font-bold block">{tCommon('today')}</span>
                <span className="text-sm font-extrabold text-text-primary mt-0.5 block">
                  {todayStr}
                </span>
              </div>
              <span className="w-8 h-8 rounded-lg bg-surface-elevated text-primary flex items-center justify-center font-bold text-xs">
                CAL
              </span>
            </Card>

            {/* Card 2: My Meal Status */}
            <Card className="p-3.5 card-shadow flex items-center justify-between">
              <div>
                <span className="text-2xs text-text-muted font-bold block">
                  {tMeals('todayMealStatus')}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      todayCell?.lunch ? 'bg-success/15 text-success' : 'bg-border text-text-muted'
                    }`}
                  >
                    {tMeals('lunch')}: {todayCell?.lunch ? tMeals('on') : tMeals('off')}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      todayCell?.dinner ? 'bg-success/15 text-success' : 'bg-border text-text-muted'
                    }`}
                  >
                    {tMeals('dinner')}: {todayCell?.dinner ? tMeals('on') : tMeals('off')}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 3: Today Menu Protein */}
            <Card className="p-3.5 card-shadow flex items-center justify-between">
              <div>
                <span className="text-2xs text-text-muted font-bold block">
                  {shopperSummary?.menu?.protein || 'Menu'}
                </span>
                <span className="text-sm font-extrabold text-text-primary mt-0.5 block truncate max-w-[150px]">
                  {shopperSummary?.menu?.note || 'Regular Meal'}
                </span>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning font-bold">
                {shopperSummary?.eggCount ?? 0} {tMeals('eggPreference')}
              </span>
            </Card>

            {/* Card 4: Mess Cutoff Time */}
            <Card className="p-3.5 card-shadow flex items-center justify-between">
              <div>
                <span className="text-2xs text-text-muted font-bold block">
                  {tMess('cutoffTime')}
                </span>
                <span className="text-sm font-extrabold text-danger mt-0.5 block">
                  {currentMess.cutoffTime}
                </span>
              </div>
              <span className="text-2xs text-text-muted px-2 py-1 rounded-md bg-surface-elevated font-semibold">
                Dhaka
              </span>
            </Card>
          </div>
        )}

        {isMessesLoading ? (
          <p className="text-text-secondary text-center py-10">{tCommon('loading')}</p>
        ) : !messes || messes.length === 0 ? (
          <Card className="text-center py-14 card-shadow space-y-4">
            <h3 className="text-xl font-bold text-text-primary">{tMess('selectMess')}</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto">{tMess('createMess')}</p>
            <Button onClick={() => setIsCreateMessOpen(true)} size="md">
              {tMess('createButton')}
            </Button>
          </Card>
        ) : (
          <>
            {/* Feature Navigation Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as typeof activeTab)}
              items={[
                { key: 'meals', label: tNav('meals') },
                { key: 'heatmap', label: tNav('heatmap') },
                { key: 'shopper', label: tNav('shopping') },
                { key: 'ledger', label: tNav('ledger') },
                { key: 'reports', label: tNav('reports') },
                { key: 'notices', label: tNav('notices') },
                { key: 'audit', label: tNav('audit') },
                ...(isManager ? [{ key: 'manager', label: tNav('manager') }] : [])
              ]}
            />

            {/* Tab Views */}
            {activeTab === 'meals' && currentMess && currentMembership && (
              <MealPreferences
                messId={currentMess.id}
                membershipId={currentMembership.id}
                token={token || undefined}
              />
            )}

            {activeTab === 'heatmap' && heatmapData && (
              <MealHeatmap
                month={heatmapData.month}
                daysInMonth={heatmapData.daysInMonth}
                rows={heatmapData.rows}
              />
            )}

            {activeTab === 'shopper' && currentMess && currentMembership && (
              <div className="space-y-6">
                {shopperSummary ? (
                  <ShopperSummary
                    summary={shopperSummary}
                    token={token || undefined}
                    isShopperOrManager={isManager}
                  />
                ) : (
                  <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
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

            {activeTab === 'ledger' && currentMess && currentMembership && (
              <LedgerView
                messId={currentMess.id}
                membershipId={currentMembership.id}
                isManager={isManager}
                token={token || undefined}
              />
            )}

            {activeTab === 'reports' && currentMess && (
              <MonthStatementView
                messId={currentMess.id}
                isManager={isManager}
                token={token || undefined}
              />
            )}

            {activeTab === 'notices' && currentMess && (
              <NoticeBoard
                messId={currentMess.id}
                isManager={isManager}
                token={token || undefined}
              />
            )}

            {activeTab === 'audit' && currentMess && (
              <AuditLogViewer messId={currentMess.id} token={token || undefined} />
            )}

            {activeTab === 'manager' && currentMess && (
              <ManagerPanel
                messId={currentMess.id}
                isManager={isManager}
                token={token || undefined}
              />
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
              placeholder="e.g., Green Mess Dhanmondi"
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
              <Button size="sm" type="submit" isLoading={isSubmitting}>
                {tMess('createButton')}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}

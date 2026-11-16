'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  getDhakaDateString
} from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
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
  const tAuth = useTranslations('auth');
  const {
    user,
    token,
    activeMessId,
    setActiveMessId,
    logout,
    isLoading: isAuthLoading
  } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'meals' | 'heatmap' | 'shopper' | 'ledger' | 'reports' | 'notices' | 'audit' | 'manager'
  >('meals');
  const [isCreateMessOpen, setIsCreateMessOpen] = useState(false);

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

  const currentMembership = members?.find((m) => m.userId === user?.id);
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
    enabled: !!currentMess?.id && activeTab === 'shopper'
  });

  // Fetch real-time balance status for user's avatar ring
  const { data: myBalance } = useQuery<{ status: BalanceStatus }>({
    queryKey: ['my-balance', currentMess?.id, currentMembership?.id],
    queryFn: () =>
      apiFetch<{ status: BalanceStatus }>(
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-secondary">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{tCommon('appName')}</h1>
          <p className="text-base text-text-secondary mb-8">{tAuth('loginSubtitle')}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push('/login')} size="lg">
              {tAuth('loginButton')}
            </Button>
            <Button onClick={() => router.push('/register')} variant="secondary" size="lg">
              {tAuth('registerButton')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b border-border bg-surface px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-text-primary">{tCommon('appName')}</span>
            {messes && messes.length > 1 ? (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                aria-label={tMess('selectMess')}
                className="text-xs bg-surface-elevated text-text-primary border border-border px-2.5 py-1 rounded-token focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : currentMess ? (
              <span className="text-xs bg-surface-elevated text-text-secondary border border-border px-2.5 py-1 rounded-token">
                {currentMess.name}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setActiveTab('manager')}>
              {tNav('manager')}
            </Button>
            <LanguageSwitcher />
            <Avatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="sm"
              status={myBalance?.status}
            />
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              {tCommon('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <PageHeader
          title={currentMess ? currentMess.name : tMess('selectMess')}
          subtitle={
            currentMess ? `${tMess('cutoffTime')}: ${currentMess.cutoffTime}` : tMess('createMess')
          }
          action={
            <Button onClick={() => setIsCreateMessOpen(true)} size="sm">
              {tMess('createMess')}
            </Button>
          }
        />

        {isMessesLoading ? (
          <p className="text-text-secondary">{tCommon('loading')}</p>
        ) : !messes || messes.length === 0 ? (
          <Card className="text-center py-12">
            <h3 className="text-lg font-semibold text-text-primary mb-2">{tMess('selectMess')}</h3>
            <p className="text-sm text-text-secondary mb-6">{tMess('createMess')}</p>
            <Button onClick={() => setIsCreateMessOpen(true)}>{tMess('createButton')}</Button>
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
                { key: 'manager', label: tNav('manager') }
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
            <Input label={tMess('messName')} error={errors.name?.message} {...register('name')} />
            <Input
              label={tMess('cutoffTime')}
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
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setIsCreateMessOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" isLoading={isSubmitting || createMessMutation.isPending}>
                {tMess('createButton')}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}

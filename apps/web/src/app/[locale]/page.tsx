'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateMessSchema, CreateMessInput, MessDto } from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
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
  const [isCreateMessOpen, setIsCreateMessOpen] = useState(false);

  // Fetch messes for user
  const { data: messes, isLoading: isMessesLoading } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined),
    enabled: !!token
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

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-surface px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-text-primary">{tCommon('appName')}</span>
            {currentMess && (
              <span className="text-xs bg-surface-elevated text-text-secondary border border-border px-2.5 py-1 rounded-token">
                {currentMess.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              {tCommon('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
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

        {/* Mess overview or Empty state */}
        {isMessesLoading ? (
          <p className="text-text-secondary">{tCommon('loading')}</p>
        ) : !messes || messes.length === 0 ? (
          <Card className="text-center py-12">
            <h3 className="text-lg font-semibold text-text-primary mb-2">{tMess('selectMess')}</h3>
            <p className="text-sm text-text-secondary mb-6">{tMess('createMess')}</p>
            <Button onClick={() => setIsCreateMessOpen(true)}>{tMess('createButton')}</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <h3 className="font-semibold text-text-primary mb-2">{tNav('meals')}</h3>
              <p className="text-sm text-text-secondary mb-4">
                {tMess('mealRate')}: {currentMess?.mealRate} {tCommon('bdt')}
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                {tCommon('actions')}
              </Button>
            </Card>

            <Card>
              <h3 className="font-semibold text-text-primary mb-2">{tNav('shopping')}</h3>
              <p className="text-sm text-text-secondary mb-4">
                {tMess('shoppersPerDay')}: {currentMess?.shoppersPerDay}
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                {tCommon('actions')}
              </Button>
            </Card>

            <Card>
              <h3 className="font-semibold text-text-primary mb-2">{tNav('ledger')}</h3>
              <p className="text-sm text-text-secondary mb-4">
                {tMess('graceDays')}: {currentMess?.graceDays}
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                {tCommon('actions')}
              </Button>
            </Card>
          </div>
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

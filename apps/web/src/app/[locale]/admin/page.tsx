'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MembershipDto, MembershipRole, MessDto } from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { ManagerPanel } from '@/components/features/manager/manager-panel';
import { Link } from '@/i18n/routing';

/**
 * Dedicated standalone Admin Panel route (/[locale]/admin) with strict Manager role verification.
 */
export default function AdminPage() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tMembers = useTranslations('members');
  const tAuth = useTranslations('auth');
  const { user, token, activeMessId, setActiveMessId, isLoading } = useAuth();

  const { data: messes, isLoading: isMessesLoading } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined),
    enabled: !!token
  });

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  const { data: members, isLoading: isMembersLoading } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', currentMess?.id],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${currentMess?.id}/members`, {}, token || undefined),
    enabled: !!currentMess?.id && !!token
  });

  const currentMembership = members?.find((m) => m.userId === user?.id);
  const isManager = currentMembership?.role === MembershipRole.MANAGER;

  if (isLoading || (user && (isMessesLoading || isMembersLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary mt-1">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center space-y-4 p-6">
          <h1 className="text-xl font-bold text-text-primary">{tAuth('loginTitle')}</h1>
          <Link href="/login" className="block">
            <Button className="w-full">{tAuth('loginButton')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface/95 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/">
              <Button variant="secondary" size="sm">
                &larr; {tCommon('back')}
              </Button>
            </Link>
            <span className="font-bold text-base sm:text-lg text-text-primary truncate">
              {tNav('manager')}
            </span>
            {messes && messes.length > 1 && (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                className="text-xs font-semibold bg-surface-elevated text-text-primary border border-border px-2.5 py-1.5 rounded-token max-w-[140px] truncate"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {!currentMess ? (
          <Card className="text-center py-10 space-y-3">
            <p className="text-sm text-text-secondary">{tMembers('managerOnly')}</p>
            <Link href="/">
              <Button size="sm">{tCommon('back')}</Button>
            </Link>
          </Card>
        ) : (
          <ManagerPanel messId={currentMess.id} isManager={isManager} token={token || undefined} />
        )}
      </main>
    </div>
  );
}

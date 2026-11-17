'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MessDto } from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { ManagerPanel } from '@/components/features/manager/manager-panel';
import { useRouter } from '@/i18n/routing';

/**
 * Dedicated standalone Admin Panel route (/[locale]/admin) for full mess management.
 */
export default function AdminPage() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const { user, token, activeMessId, setActiveMessId, isLoading } = useAuth();
  const router = useRouter();

  const { data: messes } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token || undefined)
  });

  const currentMess = messes?.find((m) => m.id === activeMessId) || messes?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary mt-2">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface/90 backdrop-blur-md px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
              &larr; {tCommon('back')}
            </Button>
            <span className="font-extrabold text-base sm:text-lg text-text-primary">
              {tNav('manager')}
            </span>
            {messes && messes.length > 1 && (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                className="text-xs font-semibold bg-surface-elevated text-text-primary border border-border px-2.5 py-1.5 rounded-token focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <span className="text-xs font-semibold text-text-secondary hidden sm:inline">
                  {user.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {currentMess ? (
          <ManagerPanel messId={currentMess.id} isManager={true} token={token || undefined} />
        ) : (
          <p className="text-sm text-text-secondary py-10 text-center">{tCommon('loading')}</p>
        )}
      </main>
    </div>
  );
}

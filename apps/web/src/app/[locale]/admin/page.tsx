'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MessDto } from '@mess/shared';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
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
        <p className="text-text-secondary">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
              {tCommon('back')}
            </Button>
            <span className="font-bold text-lg text-text-primary">{tNav('manager')}</span>
            {messes && messes.length > 1 && (
              <select
                value={currentMess?.id || ''}
                onChange={(e) => setActiveMessId(e.target.value)}
                className="text-xs bg-surface-elevated text-text-primary border border-border px-2.5 py-1 rounded-token"
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
            {user && <span className="text-xs font-medium text-text-secondary">{user.name}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {currentMess ? (
          <ManagerPanel messId={currentMess.id} isManager={true} token={token || undefined} />
        ) : (
          <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
        )}
      </main>
    </div>
  );
}

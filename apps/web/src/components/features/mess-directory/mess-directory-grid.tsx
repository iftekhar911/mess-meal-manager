'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toBengaliDigits } from '@mess/shared';
import { Link } from '@/i18n/routing';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { apiFetch } from '../../../lib/api-client';

export interface DirectoryMessItem {
  id: string;
  name: string;
  cutoffTime: string;
  mealRate: string;
  cookBill: string;
  fuelBill: string;
  memberCount: number;
  managerName: string | null;
  joinStatus: 'MEMBER' | 'PENDING' | 'REJECTED' | 'NONE';
}

export interface MessDirectoryGridProps {
  token?: string | null;
  isLoggedIn: boolean;
  onSelectMess?: (messId: string) => void;
  onCreateNew?: () => void;
}

/**
 * Responsive grid of available messes allowing users to browse and apply to join.
 */
export const MessDirectoryGrid: React.FC<MessDirectoryGridProps> = ({
  token,
  isLoggedIn,
  onSelectMess,
  onCreateNew
}) => {
  const tOnboard = useTranslations('onboarding');
  const tMess = useTranslations('messes');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const formatDigit = (val: number | string) =>
    locale === 'bn' ? toBengaliDigits(val) : String(val);

  const { data: directory, isLoading } = useQuery<DirectoryMessItem[]>({
    queryKey: ['mess-directory', token],
    queryFn: () => apiFetch<DirectoryMessItem[]>('/messes/directory', {}, token || undefined)
  });

  const applyMutation = useMutation({
    mutationFn: (messId: string) =>
      apiFetch(
        `/messes/${messId}/join-requests`,
        { method: 'POST', body: JSON.stringify({}) },
        token || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mess-directory'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            {tOnboard('joinTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{tOnboard('joinDesc')}</p>
        </div>
        {isLoggedIn && onCreateNew && (
          <Button size="sm" onClick={onCreateNew}>
            + {tMess('createMess')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-8 text-center">{tCommon('loading')}</p>
      ) : !directory || directory.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-text-secondary">{tOnboard('noMessesYet')}</p>
          {isLoggedIn && onCreateNew && (
            <Button size="sm" onClick={onCreateNew}>
              + {tMess('createButton')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directory.map((m) => (
            <Card key={m.id} className="p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-text-primary">{m.name}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border text-text-secondary shrink-0">
                    {formatDigit(m.memberCount)} {tOnboard('membersCount')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-1">
                  <div className="p-2 rounded-token bg-surface-elevated/60 border border-border">
                    <span className="block text-text-muted">{tMess('mealRate')}</span>
                    <span className="font-bold text-text-primary">
                      {formatDigit(m.mealRate)} {tCommon('bdt')}
                    </span>
                  </div>
                  <div className="p-2 rounded-token bg-surface-elevated/60 border border-border">
                    <span className="block text-text-muted">{tMess('cutoffTime')}</span>
                    <span className="font-bold text-text-primary">{m.cutoffTime}</span>
                  </div>
                </div>
              </div>

              <div>
                {!isLoggedIn ? (
                  <Link href="/register" className="block">
                    <Button size="sm" className="w-full">
                      {tOnboard('applyToJoin')}
                    </Button>
                  </Link>
                ) : m.joinStatus === 'MEMBER' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => onSelectMess?.(m.id)}
                  >
                    {tOnboard('alreadyMember')}
                  </Button>
                ) : m.joinStatus === 'PENDING' ? (
                  <div className="w-full h-9 flex items-center justify-center rounded-token bg-warning-surface border border-warning/30 text-warning text-xs font-bold">
                    {tOnboard('appliedPending')}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    isLoading={applyMutation.isPending && applyMutation.variables === m.id}
                    onClick={() => applyMutation.mutate(m.id)}
                  >
                    {m.joinStatus === 'REJECTED' ? tOnboard('reapply') : tOnboard('applyToJoin')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { AuditLogDto } from '@mess/shared';
import { Card } from '../../ui/card';
import { apiFetch } from '../../../lib/api-client';

export interface AuditLogViewerProps {
  messId: string;
  token?: string;
}

type EnrichedAuditLog = AuditLogDto & { actorName?: string };

const KNOWN_ACTIONS = [
  'MEMBER_ADDED',
  'MEMBER_UPDATED',
  'MEMBER_REMOVED',
  'DEPOSIT_RECORDED',
  'LEDGER_ADJUSTMENT',
  'FORCE_OVERRIDE',
  'EXPENSE_APPROVED',
  'EXPENSE_REJECTED',
  'FUEL_EXPENSE_RECORDED',
  'MESS_SETTINGS_UPDATED',
  'MONTH_CLOSED',
  'RATE_UPDATED',
  'DEPOSIT_EDITED',
  'JOIN_REQUEST_APPROVED',
  'JOIN_REQUEST_REJECTED'
] as const;

/**
 * Clean, human-readable audit log timeline for mess transparency.
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ messId, token }) => {
  const t = useTranslations('audit');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data: logs, isLoading } = useQuery<EnrichedAuditLog[]>({
    queryKey: ['audit-logs', messId],
    queryFn: () => apiFetch<EnrichedAuditLog[]>(`/messes/${messId}/audit`, {}, token),
    enabled: !!messId
  });

  const formatTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka'
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 16);
    }
  };

  const getActionLabel = (action: string) => {
    if ((KNOWN_ACTIONS as readonly string[]).includes(action)) {
      return t(`actions.${action}`);
    }
    return action.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <Card className="space-y-4">
      <div className="pb-2 border-b border-border">
        <h3 className="font-bold text-base sm:text-lg text-text-primary">{t('title')}</h3>
        <p className="text-xs text-text-muted mt-0.5">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
      ) : !logs || logs.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">{t('noLogs')}</p>
      ) : (
        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div
              key={log.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-surface text-primary border border-primary/20">
                    {getActionLabel(log.action)}
                  </span>
                  {log.actorName && (
                    <span className="text-xs font-semibold text-text-primary">{log.actorName}</span>
                  )}
                </div>
                {log.reason && <p className="text-sm text-text-secondary">{log.reason}</p>}
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {formatTime(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

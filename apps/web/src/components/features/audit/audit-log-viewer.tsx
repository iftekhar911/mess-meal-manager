'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { AuditLogDto } from '@mess/shared';
import { Card } from '../../ui/card';
import { apiFetch } from '../../../lib/api-client';

export interface AuditLogViewerProps {
  messId: string;
  token?: string;
}

/**
 * Transparent audit log viewer showing manager exceptions, overrides,
 * liability records, and reversing entries.
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ messId, token }) => {
  const t = useTranslations('audit');
  const tCommon = useTranslations('common');

  const { data: logs, isLoading } = useQuery<AuditLogDto[]>({
    queryKey: ['audit-logs', messId],
    queryFn: () => apiFetch<AuditLogDto[]>(`/messes/${messId}/audit`, {}, token),
    enabled: !!messId
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text-primary">{t('title')}</h2>
        <p className="text-xs text-text-secondary">{t('subtitle')}</p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card className="text-center py-8 text-text-secondary text-sm">{t('noLogs')}</Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-token border border-primary/20">
                    {log.action}
                  </span>
                  <span className="text-xs text-text-muted">({log.entity})</span>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>

              {log.reason && (
                <div className="text-sm bg-surface-elevated p-2.5 rounded-token border border-border">
                  <span className="font-medium text-text-primary block text-xs mb-1">
                    {t('reason')}:
                  </span>
                  <p className="text-text-secondary text-xs">{log.reason}</p>
                </div>
              )}

              {(log.before || log.after) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                  {log.before && (
                    <div className="p-2 bg-surface-elevated rounded-token border border-border">
                      <span className="font-semibold text-text-muted block mb-1">Before:</span>
                      <pre className="text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div className="p-2 bg-surface-elevated rounded-token border border-border">
                      <span className="font-semibold text-text-muted block mb-1">After:</span>
                      <pre className="text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

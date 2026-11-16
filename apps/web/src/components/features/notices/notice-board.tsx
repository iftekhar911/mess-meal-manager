'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NoticeDto } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface NoticeBoardProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

/**
 * Notice board listing announcements and enabling managers to post new notices.
 */
export const NoticeBoard: React.FC<NoticeBoardProps> = ({ messId, isManager = false, token }) => {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: notices, isLoading } = useQuery<NoticeDto[]>({
    queryKey: ['notices', messId],
    queryFn: () => apiFetch<NoticeDto[]>(`/messes/${messId}/notices`, {}, token),
    enabled: !!messId
  });

  const postMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/notices`,
        {
          method: 'POST',
          body: JSON.stringify({ title, body })
        },
        token
      ),
    onSuccess: () => {
      setIsPostModalOpen(false);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['notices', messId] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-text-primary">{t('notices')}</h3>
        {isManager && (
          <Button onClick={() => setIsPostModalOpen(true)} size="sm">
            {tCommon('actions')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
      ) : !notices || notices.length === 0 ? (
        <Card className="text-center py-8 text-text-secondary text-sm">{tCommon('error')}</Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Card key={notice.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base text-text-primary">{notice.title}</h4>
                <span className="text-xs text-text-muted">{notice.createdAt.slice(0, 10)}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{notice.body}</p>
              {notice.authorName && (
                <span className="text-xs text-text-muted block">{notice.authorName}</span>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Post Notice Modal */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title={t('notices')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('status')}
            placeholder="Notice title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">{tCommon('appName')}</label>
            <textarea
              className="min-h-[100px] p-3 bg-surface border border-border rounded-token text-base text-text-primary placeholder:text-text-muted focus-ring transition-colors"
              placeholder="Notice description and details"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsPostModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={postMutation.isPending}
              onClick={() => postMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

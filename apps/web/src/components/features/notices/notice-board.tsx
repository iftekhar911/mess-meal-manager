'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NoticeDto } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface NoticeBoardProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

/**
 * Notice board listing mess announcements with manager post and delete controls.
 */
export const NoticeBoard: React.FC<NoticeBoardProps> = ({ messId, isManager = false, token }) => {
  const t = useTranslations('notices');
  const tNav = useTranslations('nav');
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
        { method: 'POST', body: JSON.stringify({ title, body }) },
        token
      ),
    onSuccess: () => {
      setIsPostModalOpen(false);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['notices', messId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messes/${messId}/notices/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices', messId] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-text-primary">{tNav('notices')}</h3>
        {isManager && (
          <Button onClick={() => setIsPostModalOpen(true)} size="sm">
            + {t('postNotice')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
      ) : !notices || notices.length === 0 ? (
        <Card className="text-center py-8 text-text-muted text-sm font-medium">
          {t('noNotices')}
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Card key={notice.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-base text-text-primary">{notice.title}</h4>
                <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-surface-elevated border border-border shrink-0">
                  {notice.createdAt.slice(0, 10)}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {notice.body}
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                {notice.authorName ? (
                  <p className="text-xs text-text-muted font-medium">
                    {t('publishedBy')}:{' '}
                    <span className="text-text-primary font-semibold">{notice.authorName}</span>
                  </p>
                ) : (
                  <div />
                )}
                {isManager && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger h-8 text-xs"
                    onClick={() => deleteMutation.mutate(notice.id)}
                    isLoading={deleteMutation.isPending}
                  >
                    {tCommon('delete')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title={t('postNotice')}
      >
        <div className="space-y-4">
          <Input
            label={t('noticeTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={t('noticeBody')}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsPostModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={postMutation.isPending}
              onClick={() => postMutation.mutate()}
              disabled={!title.trim() || !body.trim()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

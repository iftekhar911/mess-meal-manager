'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MembershipDto, MembershipRole, toBengaliDigits } from '@mess/shared';
import { DataTable, ColumnDef } from '../../ui/data-table';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { StatusDot } from '../../ui/status-dot';
import { apiFetch } from '../../../lib/api-client';

export interface ManagerPanelProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

/**
 * Manager administration view for adding boarders, managing cook bills,
 * and viewing active mess memberships.
 */
export const ManagerPanel: React.FC<ManagerPanelProps> = ({ messId, isManager = false, token }) => {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [cookBill, setCookBill] = useState(250);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const { data: members, isLoading } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${messId}/members?activeOnly=false`, {}, token),
    enabled: !!messId
  });

  const addBoarderMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({
            phone,
            name: name || undefined,
            cookBillAmount: Number(cookBill)
          })
        },
        token
      ),
    onSuccess: () => {
      setIsAddModalOpen(false);
      setPhone('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['mess-members', messId] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(
        `/messes/${messId}/members/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mess-members', messId] });
    }
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{tCommon('loading')}</p>;
  }

  const columns: ColumnDef<MembershipDto>[] = [
    {
      header: tAuth('nameLabel'),
      accessor: (m) => (
        <div className="flex items-center gap-2">
          <StatusDot status={m.isActive ? 'success' : 'neutral'} />
          <div>
            <span className="font-medium text-text-primary block">{m.user?.name || 'Member'}</span>
            <span className="text-xs text-text-muted">{m.user?.phone}</span>
          </div>
        </div>
      )
    },
    {
      header: t('role'),
      accessor: (m) => (
        <span className="text-xs px-2.5 py-1 rounded-token bg-surface-elevated border border-border font-medium">
          {m.role === MembershipRole.MANAGER ? t('manager') : t('boarder')}
        </span>
      )
    },
    {
      header: t('cookBill'),
      align: 'right',
      accessor: (m) => (
        <span className="font-medium">
          {formatDigit(Number(m.cookBillAmount).toFixed(0))} {tCommon('bdt')}
        </span>
      )
    },
    {
      header: tCommon('status'),
      align: 'right',
      accessor: (m) =>
        isManager && m.role !== MembershipRole.MANAGER ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toggleActiveMutation.mutate({ id: m.id, isActive: !m.isActive })}
          >
            {m.isActive ? t('statusActive') : t('statusInactive')}
          </Button>
        ) : (
          <span className="text-xs text-text-secondary">
            {m.isActive ? t('statusActive') : t('statusInactive')}
          </span>
        )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">{t('title')}</h2>
        {isManager && (
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            {t('addBoarder')}
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={members || []} keyExtractor={(m) => m.id} />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('addBoarder')}
      >
        <div className="space-y-4">
          <Input
            label={tAuth('phoneLabel')}
            placeholder={tAuth('phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label={tAuth('nameLabel')}
            placeholder={tAuth('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label={t('cookBill')}
            type="number"
            value={cookBill}
            onChange={(e) => setCookBill(Number(e.target.value))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => addBoarderMutation.mutate()}
              isLoading={addBoarderMutation.isPending}
              disabled={!phone}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

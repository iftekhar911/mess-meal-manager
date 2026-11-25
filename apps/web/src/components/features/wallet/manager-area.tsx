'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../../ui/button';
import { ManagerPanel } from '../manager/manager-panel';
import { MonthStatementView } from '../reports/month-statement-view';
import { LedgerView } from '../ledger/ledger-view';
import { AuditLogViewer } from '../audit/audit-log-viewer';

export interface ManagerAreaProps {
  messId: string;
  membershipId: string;
  token?: string;
}

/**
 * Separate Manager Area visible ONLY to mess managers.
 * Houses all members' private balances/deposits, month close, settings, exceptions, and audit log.
 */
export const ManagerArea: React.FC<ManagerAreaProps> = ({ messId, membershipId, token }) => {
  const tNav = useTranslations('nav');
  const tWallet = useTranslations('wallet');

  const [tab, setTab] = useState<'controls' | 'balances' | 'close' | 'audit'>('controls');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === 'controls' ? 'primary' : 'secondary'}
          onClick={() => setTab('controls')}
        >
          {tWallet('tabManager')}
        </Button>
        <Button
          size="sm"
          variant={tab === 'balances' ? 'primary' : 'secondary'}
          onClick={() => setTab('balances')}
        >
          {tNav('ledger')}
        </Button>
        <Button
          size="sm"
          variant={tab === 'close' ? 'primary' : 'secondary'}
          onClick={() => setTab('close')}
        >
          {tNav('reports')}
        </Button>
        <Button
          size="sm"
          variant={tab === 'audit' ? 'primary' : 'secondary'}
          onClick={() => setTab('audit')}
        >
          {tNav('audit')}
        </Button>
      </div>

      {tab === 'controls' && <ManagerPanel messId={messId} isManager={true} token={token} />}
      {tab === 'balances' && (
        <LedgerView messId={messId} membershipId={membershipId} isManager={true} token={token} />
      )}
      {tab === 'close' && <MonthStatementView messId={messId} isManager={true} token={token} />}
      {tab === 'audit' && <AuditLogViewer messId={messId} token={token} />}
    </div>
  );
};

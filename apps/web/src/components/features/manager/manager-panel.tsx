'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessDto,
  MembershipDto,
  MembershipRole,
  SlotType,
  EggPreference,
  ProteinType,
  LedgerType,
  ShoppingExpenseDto,
  BalanceEvaluationDto,
  LedgerEntryDto,
  NoticeDto,
  AuditLogDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { DataTable, ColumnDef } from '../../ui/data-table';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select } from '../../ui/select';
import { Modal } from '../../ui/modal';
import { Tabs } from '../../ui/tabs';
import { StatusDot } from '../../ui/status-dot';
import { Toast } from '../../ui/toast';
import { apiFetch } from '../../../lib/api-client';

export interface ManagerPanelProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

type AdminSection = 'members' | 'finance' | 'meals' | 'shopping' | 'settings' | 'operations';

/**
 * Dedicated Admin Command Center providing full control over members, roles,
 * deposits, reversing adjustments, locked meal force overrides, shopping
 * expense approvals, roster assignments, fuel expenses, mess settings,
 * notices, month close, and audit logs.
 */
export const ManagerPanel: React.FC<ManagerPanelProps> = ({ messId, token }) => {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tMess = useTranslations('messes');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<AdminSection>('members');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setToastMsg(msg);
  };

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const today = getDhakaDateString();
  const currentMonth = today.slice(0, 7);

  // 1. Queries
  const { data: messes } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token),
    enabled: !!messId
  });
  const currentMess = messes?.find((m) => m.id === messId) || messes?.[0];

  const { data: members, isLoading: isMembersLoading } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members', messId],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${messId}/members?activeOnly=false`, {}, token),
    enabled: !!messId
  });

  const [selectedFinanceMemberId, setSelectedFinanceMemberId] = useState<string>('');

  useEffect(() => {
    if (!selectedFinanceMemberId && members && members.length > 0) {
      setSelectedFinanceMemberId(members[0]!.id);
    }
  }, [members, selectedFinanceMemberId]);

  const { data: selectedBalance } = useQuery<BalanceEvaluationDto>({
    queryKey: ['ledger-balance', selectedFinanceMemberId],
    queryFn: () =>
      apiFetch<BalanceEvaluationDto>(
        `/messes/${messId}/ledger/balance/${selectedFinanceMemberId}`,
        {},
        token
      ),
    enabled: !!messId && !!selectedFinanceMemberId
  });

  const { data: selectedStatement } = useQuery<LedgerEntryDto[]>({
    queryKey: ['ledger-statement', selectedFinanceMemberId],
    queryFn: () =>
      apiFetch<LedgerEntryDto[]>(
        `/messes/${messId}/ledger/statement/${selectedFinanceMemberId}`,
        {},
        token
      ),
    enabled: !!messId && !!selectedFinanceMemberId
  });

  const { data: shoppingExpenses } = useQuery<ShoppingExpenseDto[]>({
    queryKey: ['expenses-shopping', messId, currentMonth],
    queryFn: () =>
      apiFetch<ShoppingExpenseDto[]>(
        `/messes/${messId}/expenses/shopping?month=${currentMonth}`,
        {},
        token
      ),
    enabled: !!messId
  });

  const { data: notices } = useQuery<NoticeDto[]>({
    queryKey: ['notices', messId],
    queryFn: () => apiFetch<NoticeDto[]>(`/messes/${messId}/notices`, {}, token),
    enabled: !!messId
  });

  const { data: auditLogs } = useQuery<AuditLogDto[]>({
    queryKey: ['audit-logs', messId],
    queryFn: () => apiFetch<AuditLogDto[]>(`/messes/${messId}/audit`, {}, token),
    enabled: !!messId
  });

  // 2. Member States & Mutations
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [newRole, setNewRole] = useState<MembershipRole>(MembershipRole.BOARDER);
  const [cookBill, setCookBill] = useState(250);

  const [editingMember, setEditingMember] = useState<MembershipDto | null>(null);
  const [editCookBill, setEditCookBill] = useState(250);

  const addBoarderMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({
            phone,
            name: name || undefined,
            role: newRole,
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
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      showSuccess(tCommon('success'));
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      isActive?: boolean;
      role?: MembershipRole;
      cookBillAmount?: number;
    }) =>
      apiFetch(
        `/messes/${messId}/members/${payload.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload)
        },
        token
      ),
    onSuccess: () => {
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ['mess-members', messId] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messes/${messId}/members/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mess-members', messId] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  // 3. Finance / Ledger States & Mutations
  const [depositAmount, setDepositAmount] = useState<number>(1500);
  const [depositNote, setDepositNote] = useState('মাসিক মিল জমা (Monthly Deposit)');
  const [adjType, setAdjType] = useState<LedgerType>(LedgerType.ADJUSTMENT);
  const [adjAmount, setAdjAmount] = useState<number>(200);
  const [adjReason, setAdjReason] = useState('');

  const recordDepositMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/deposit`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: selectedFinanceMemberId,
            amount: Number(depositAmount),
            date: today,
            note: depositNote,
            restoreAutoOffMeals: true
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const recordAdjustmentMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/adjustment`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: selectedFinanceMemberId,
            type: adjType,
            amount: Number(adjAmount),
            date: today,
            reason: adjReason || 'Admin reversing adjustment'
          })
        },
        token
      ),
    onSuccess: () => {
      setAdjReason('');
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  // 4. Locked Meal Force Override States & Mutation
  const [overrideMemberId, setOverrideMemberId] = useState<string>('');
  const [overrideDate, setOverrideDate] = useState(today);
  const [overrideSlot, setOverrideSlot] = useState<SlotType>(SlotType.LUNCH);
  const [overrideStatus, setOverrideStatus] = useState<boolean>(true);
  const [overrideEgg, setOverrideEgg] = useState<EggPreference>(EggPreference.NONE);
  const [overrideGuests, setOverrideGuests] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (!overrideMemberId && members && members.length > 0) {
      setOverrideMemberId(members[0]!.id);
    }
  }, [members, overrideMemberId]);

  const forceOverrideMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/meals/force-override`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: overrideMemberId,
            date: overrideDate,
            slot: overrideSlot,
            status: overrideStatus,
            eggPreference: overrideEgg,
            guestCount: Number(overrideGuests),
            reason: overrideReason || 'Admin forced locked meal exception'
          })
        },
        token
      ),
    onSuccess: () => {
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  // 5. Shopping, Roster, Fuel & Menu Mutations
  const [assignMemberId, setAssignMemberId] = useState<string>('');
  const [assignDate, setAssignDate] = useState(today);
  const [fuelAmount, setFuelAmount] = useState<number>(1200);
  const [fuelNote, setFuelNote] = useState('গ্যাস সিলিন্ডার বিল (Gas Cylinder)');
  const [menuProtein, setMenuProtein] = useState<ProteinType>(ProteinType.FISH);
  const [menuNote, setMenuNote] = useState('রুই মাছ ও সবজি');

  useEffect(() => {
    if (!assignMemberId && members && members.length > 0) {
      setAssignMemberId(members[0]!.id);
    }
  }, [members, assignMemberId]);

  const approveExpenseMutation = useMutation({
    mutationFn: (expenseId: string) =>
      apiFetch(
        `/messes/${messId}/expenses/shopping/${expenseId}/approve`,
        { method: 'POST' },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      showSuccess(tCommon('success'));
    }
  });

  const rejectExpenseMutation = useMutation({
    mutationFn: (expenseId: string) =>
      apiFetch(
        `/messes/${messId}/expenses/shopping/${expenseId}/reject`,
        { method: 'POST' },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const assignRosterMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/assign`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: assignMemberId,
            date: assignDate
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const autoShuffleMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/roster/auto-shuffle?month=${currentMonth}`,
        { method: 'POST' },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const recordFuelMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/expenses/fuel`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: today,
            amount: Number(fuelAmount),
            note: fuelNote
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const updateMenuMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/menus`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: today,
            protein: menuProtein,
            note: menuNote
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
      showSuccess(tCommon('success'));
    }
  });

  // 6. Mess Settings States & Mutation
  const [settingsName, setSettingsName] = useState('');
  const [settingsCutoff, setSettingsCutoff] = useState('22:00:00');
  const [settingsMealRate, setSettingsMealRate] = useState(50);
  const [settingsGraceDays, setSettingsGraceDays] = useState(3);
  const [settingsWarningDays, setSettingsWarningDays] = useState(2);
  const [settingsShoppersPerDay, setSettingsShoppersPerDay] = useState(2);
  const [settingsShopQuota, setSettingsShopQuota] = useState(2);

  useEffect(() => {
    if (currentMess) {
      setSettingsName(currentMess.name);
      setSettingsCutoff(currentMess.cutoffTime);
      setSettingsMealRate(Number(currentMess.mealRate));
      setSettingsGraceDays(currentMess.graceDays);
      setSettingsWarningDays(currentMess.warningDays);
      setSettingsShoppersPerDay(currentMess.shoppersPerDay);
      setSettingsShopQuota(currentMess.shopTimesPerMonth);
    }
  }, [currentMess]);

  const updateMessSettingsMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: settingsName,
            cutoffTime: settingsCutoff,
            mealRate: Number(settingsMealRate),
            graceDays: Number(settingsGraceDays),
            warningDays: Number(settingsWarningDays),
            shoppersPerDay: Number(settingsShoppersPerDay),
            shopTimesPerMonth: Number(settingsShopQuota)
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-messes'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  // 7. Notices & Month Close Mutations
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [closeMonthTarget, setCloseMonthTarget] = useState(currentMonth);

  const postNoticeMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/notices`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: noticeTitle,
            body: noticeBody
          })
        },
        token
      ),
    onSuccess: () => {
      setNoticeTitle('');
      setNoticeBody('');
      queryClient.invalidateQueries({ queryKey: ['notices', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (noticeId: string) =>
      apiFetch(`/messes/${messId}/notices/${noticeId}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices', messId] });
      showSuccess(tCommon('success'));
    }
  });

  const closeMonthMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/reports/close-month`,
        {
          method: 'POST',
          body: JSON.stringify({
            month: closeMonthTarget
          })
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['month-statement'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
      showSuccess(tCommon('success'));
    }
  });

  if (isMembersLoading) {
    return <p className="text-sm text-text-secondary">{tCommon('loading')}</p>;
  }

  const memberOptions = (members || []).map((m) => ({
    value: m.id,
    label: `${m.user?.name || 'Member'} (${m.user?.phone || ''})`
  }));

  const activeCount = (members || []).filter((m) => m.isActive).length;
  const managerCount = (members || []).filter((m) => m.role === MembershipRole.MANAGER).length;
  const totalCookBill = (members || [])
    .filter((m) => m.isActive)
    .reduce((acc, m) => acc + Number(m.cookBillAmount || 0), 0);

  const memberColumns: ColumnDef<MembershipDto>[] = [
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
      header: tCommon('actions'),
      align: 'right',
      accessor: (m) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingMember(m);
              setEditCookBill(Number(m.cookBillAmount));
            }}
          >
            {tCommon('edit')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              updateMemberMutation.mutate({
                id: m.id,
                role:
                  m.role === MembershipRole.MANAGER
                    ? MembershipRole.BOARDER
                    : MembershipRole.MANAGER
              })
            }
          >
            {m.role === MembershipRole.MANAGER ? t('boarder') : t('manager')}
          </Button>
          <Button
            size="sm"
            variant={m.isActive ? 'secondary' : 'primary'}
            onClick={() => updateMemberMutation.mutate({ id: m.id, isActive: !m.isActive })}
          >
            {m.isActive ? t('statusActive') : t('statusInactive')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => removeMemberMutation.mutate(m.id)}>
            {tCommon('delete')}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toast
        message={toastMsg || ''}
        variant="success"
        isOpen={Boolean(toastMsg)}
        onClose={() => setToastMsg(null)}
      />

      {/* Admin Command Center Header & Quick Summary */}
      <Card className="bg-surface-elevated border-border-strong space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {locale === 'bn'
                ? 'অ্যাডমিন ও ম্যানেজার কন্ট্রোল প্যানেল'
                : 'Admin & Manager Command Center'}
            </h2>
            <p className="text-xs text-text-secondary">
              {locale === 'bn'
                ? 'মেসের সদস্য, টাকা জমা, লকড মিল পরিবর্তন, বাজার অনুমোদন, মেস সেটিংস এবং মাস সমাপ্তির পূর্ণ নিয়ন্ত্রণ'
                : 'Complete administrative control over members, deposits, locked meals, market approvals, mess settings, and month close'}
            </p>
          </div>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            + {t('addBoarder')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-surface rounded-token border border-border">
            <span className="text-xs text-text-secondary block">
              {locale === 'bn' ? 'সক্রিয় সদস্য' : 'Active Members'}
            </span>
            <span className="text-lg font-bold text-primary">{formatDigit(activeCount)}</span>
          </div>
          <div className="p-3 bg-surface rounded-token border border-border">
            <span className="text-xs text-text-secondary block">
              {locale === 'bn' ? 'ম্যানেজার সংখ্যা' : 'Managers'}
            </span>
            <span className="text-lg font-bold text-text-primary">{formatDigit(managerCount)}</span>
          </div>
          <div className="p-3 bg-surface rounded-token border border-border">
            <span className="text-xs text-text-secondary block">
              {locale === 'bn' ? 'বর্তমান মিল রেট' : 'Current Meal Rate'}
            </span>
            <span className="text-lg font-bold text-success">
              {formatDigit(currentMess?.mealRate || '50')} {tCommon('bdt')}
            </span>
          </div>
          <div className="p-3 bg-surface rounded-token border border-border">
            <span className="text-xs text-text-secondary block">
              {locale === 'bn' ? 'মোট মাসিক খালা বিল' : 'Total Cook Bill'}
            </span>
            <span className="text-lg font-bold text-text-primary">
              {formatDigit(totalCookBill)} {tCommon('bdt')}
            </span>
          </div>
        </div>
      </Card>

      {/* Admin Sub-Navigation Tabs */}
      <Tabs
        activeKey={activeSection}
        onChange={(k) => setActiveSection(k as AdminSection)}
        items={[
          {
            key: 'members',
            label: locale === 'bn' ? '১. সদস্য ও ভূমিকা' : '1. Members & Roles'
          },
          {
            key: 'finance',
            label: locale === 'bn' ? '২. জমা ও লেজার সমন্বয়' : '2. Deposits & Ledger'
          },
          {
            key: 'meals',
            label: locale === 'bn' ? '৩. লকড মিল ফোর্স পরিবর্তন' : '3. Locked Meal Override'
          },
          {
            key: 'shopping',
            label: locale === 'bn' ? '৪. বাজার, রোস্টার ও গ্যাস' : '4. Shopping, Roster & Fuel'
          },
          {
            key: 'settings',
            label: locale === 'bn' ? '৫. মেস সেটিংস' : '5. Mess Settings'
          },
          {
            key: 'operations',
            label: locale === 'bn' ? '৬. বিজ্ঞপ্তি ও মাস সমাপ্তি' : '6. Notices & Month Close'
          }
        ]}
      />

      {/* SECTION 1: MEMBERS & ROLES */}
      {activeSection === 'members' && (
        <div className="space-y-4">
          <DataTable columns={memberColumns} data={members || []} keyExtractor={(m) => m.id} />
        </div>
      )}

      {/* SECTION 2: DEPOSITS & LEDGER ADJUSTMENTS */}
      {activeSection === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn' ? 'সদস্যের টাকা জমা রেকর্ড করুন' : 'Record Member Deposit'}
            </h3>

            <Select
              label={locale === 'bn' ? 'সদস্য নির্বাচন করুন' : 'Select Member'}
              value={selectedFinanceMemberId}
              options={memberOptions}
              onChange={(e) => setSelectedFinanceMemberId(e.target.value)}
            />

            {selectedBalance && (
              <div className="p-3 bg-surface-elevated rounded-token border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-text-secondary block">
                    {locale === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatDigit(selectedBalance.currentBalance)} {tCommon('bdt')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-secondary block">
                    {locale === 'bn' ? 'অবশিষ্ট দিন' : 'Days Left'}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatDigit(selectedBalance.daysRemaining)} days ({selectedBalance.status})
                  </span>
                </div>
              </div>
            )}

            <Input
              label={locale === 'bn' ? 'জমার পরিমাণ (টাকা)' : 'Deposit Amount (BDT)'}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />

            <Input
              label={locale === 'bn' ? 'নোট / মাধ্যম (যেমন: নগদ / বিকাশ)' : 'Note / Payment Method'}
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
            />

            <Button
              className="w-full"
              onClick={() => recordDepositMutation.mutate()}
              isLoading={recordDepositMutation.isPending}
            >
              {locale === 'bn'
                ? 'জমা নিশ্চিত করুন ও অটো-অফ মিল চালু করুন'
                : 'Confirm Deposit & Restore Auto-Off Meals'}
            </Button>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'রিভার্সিং এন্ট্রি / জরিমানা বা রিফান্ড সমন্বয়'
                : 'Reversing Entry / Fine or Refund Adjustment'}
            </h3>
            <p className="text-xs text-text-secondary">
              {locale === 'bn'
                ? 'লেজারের কোনো এন্ট্রি ডিলিট না করে রিভার্সিং সমন্বয় বা রিফান্ড রেকর্ড করুন (অডিট লগে কারণ সংরক্ষিত থাকবে)'
                : 'Append-only ledger rule: record adjustments or refunds with a mandatory audit reason'}
            </p>

            <Select
              label={locale === 'bn' ? 'সমন্বয়ের ধরন' : 'Adjustment Type'}
              value={adjType}
              options={[
                {
                  value: LedgerType.ADJUSTMENT,
                  label:
                    locale === 'bn'
                      ? 'খরচ সমন্বয় (Debit Adjustment)'
                      : 'Debit Adjustment (ADJUSTMENT)'
                },
                {
                  value: LedgerType.REFUND,
                  label: locale === 'bn' ? 'টাকা ফেরত (Refund)' : 'Refund (REFUND)'
                }
              ]}
              onChange={(e) => setAdjType(e.target.value as LedgerType)}
            />

            <Input
              label={locale === 'bn' ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}
              type="number"
              value={adjAmount}
              onChange={(e) => setAdjAmount(Number(e.target.value))}
            />

            <Input
              label={locale === 'bn' ? 'বাধ্যতামূলক কারণ (Audit Reason)' : 'Mandatory Audit Reason'}
              placeholder={
                locale === 'bn'
                  ? 'যেমন: ভুলবশত অতিরিক্ত চার্জ সংশোধন'
                  : 'e.g., Correction of previous entry'
              }
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
            />

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => recordAdjustmentMutation.mutate()}
              isLoading={recordAdjustmentMutation.isPending}
              disabled={!adjReason.trim()}
            >
              {locale === 'bn' ? 'সমন্বয় এন্ট্রি পোস্ট করুন' : 'Post Reversing Adjustment'}
            </Button>

            {selectedStatement && selectedStatement.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-xs font-semibold text-text-secondary block">
                  {locale === 'bn' ? 'সর্বশেষ লেনদেন সমূহ' : 'Recent Member Transactions'}
                </span>
                <div className="max-h-40 overflow-y-auto divide-y divide-border text-xs">
                  {selectedStatement.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="py-1.5 flex items-center justify-between">
                      <span>
                        <strong>{entry.type}</strong> - {entry.note || entry.date}
                      </span>
                      <span className="font-semibold">
                        {formatDigit(entry.amount)} {tCommon('bdt')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION 3: LOCKED MEAL FORCE OVERRIDE */}
      {activeSection === 'meals' && (
        <Card className="max-w-2xl space-y-4">
          <div>
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'লকড মিল ফোর্স ওভাররাইড ও মেহমান মিল নিয়ন্ত্রণ'
                : 'Manager Force Meal Override & Guest Control'}
            </h3>
            <p className="text-xs text-text-secondary">
              {locale === 'bn'
                ? 'রাত ১০টা কাটঅফ সময়ের পরেও যেকোনো বর্ডারের মিল চালু/বন্ধ বা মেহমান সংখ্যা পরিবর্তন করুন। এই পরিবর্তনটি ম্যানেজার দায়বদ্ধতা হিসেবে অডিট লগে রেকর্ড হবে।'
                : 'Force modify any boarder meal slot even after cutoff lock. Recorded in the manager liability audit trail.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={locale === 'bn' ? 'সদস্য নির্বাচন করুন' : 'Select Boarder'}
              value={overrideMemberId}
              options={memberOptions}
              onChange={(e) => setOverrideMemberId(e.target.value)}
            />

            <Input
              label={locale === 'bn' ? 'তারিখ' : 'Target Date'}
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
            />

            <Select
              label={locale === 'bn' ? 'বেলা (দুপুর / রাত)' : 'Meal Slot'}
              value={overrideSlot}
              options={[
                { value: SlotType.LUNCH, label: locale === 'bn' ? 'দুপুর (Lunch)' : 'Lunch' },
                { value: SlotType.DINNER, label: locale === 'bn' ? 'রাত (Dinner)' : 'Dinner' }
              ]}
              onChange={(e) => setOverrideSlot(e.target.value as SlotType)}
            />

            <Select
              label={locale === 'bn' ? 'মিল অবস্থা' : 'Meal Status'}
              value={overrideStatus ? 'ON' : 'OFF'}
              options={[
                { value: 'ON', label: locale === 'bn' ? 'মিল চালু (ON)' : 'Active (ON)' },
                { value: 'OFF', label: locale === 'bn' ? 'মিল বন্ধ (OFF)' : 'Off (OFF)' }
              ]}
              onChange={(e) => setOverrideStatus(e.target.value === 'ON')}
            />

            <Select
              label={locale === 'bn' ? 'ডিম পছন্দ' : 'Egg Preference'}
              value={overrideEgg}
              options={[
                {
                  value: EggPreference.NONE,
                  label: locale === 'bn' ? 'সাধারণ মেন্যু' : 'Standard Menu'
                },
                {
                  value: EggPreference.INSTEAD_OF_FISH,
                  label: locale === 'bn' ? 'মাছের বদলে ডিম' : 'Egg Instead of Fish'
                },
                {
                  value: EggPreference.INSTEAD_OF_CHICKEN,
                  label: locale === 'bn' ? 'মুরগির বদলে ডিম' : 'Egg Instead of Chicken'
                }
              ]}
              onChange={(e) => setOverrideEgg(e.target.value as EggPreference)}
            />

            <Input
              label={locale === 'bn' ? 'মেহমান মিল সংখ্যা' : 'Guest Count'}
              type="number"
              min={0}
              max={20}
              value={overrideGuests}
              onChange={(e) => setOverrideGuests(Number(e.target.value))}
            />
          </div>

          <Input
            label={locale === 'bn' ? 'বাধ্যতামূলক কারণ (Audit Reason)' : 'Mandatory Exception Reason'}
            placeholder={
              locale === 'bn'
                ? 'যেমন: জরুরি অনুরোধে রাত ১১টায় মিল বন্ধ করা হলো'
                : 'e.g., Boarder called manager due to medical emergency'
            }
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />

          <Button
            onClick={() => forceOverrideMutation.mutate()}
            isLoading={forceOverrideMutation.isPending}
            disabled={!overrideReason.trim()}
          >
            {locale === 'bn' ? 'ফোর্স ওভাররাইড কার্যকর করুন' : 'Apply Force Override'}
          </Button>
        </Card>
      )}

      {/* SECTION 4: SHOPPING, ROSTER, FUEL & MENU */}
      {activeSection === 'shopping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'বাজার খরচ অনুমোদন ও যাচাই'
                : 'Market Expense Verification & Approvals'}
            </h3>
            {!shoppingExpenses || shoppingExpenses.length === 0 ? (
              <p className="text-xs text-text-secondary">
                {locale === 'bn'
                  ? 'এই মাসে কোনো বাজার খরচ পাওয়া যায়নি'
                  : 'No shopping expenses recorded yet'}
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {shoppingExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-token border border-border bg-surface-elevated space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-text-primary block">
                          {exp.shopper?.user?.name || 'Shopper'} ({exp.date})
                        </span>
                        <span className="text-xs text-text-muted">Status: {exp.status}</span>
                      </div>
                      <span className="font-bold text-primary">
                        {formatDigit(exp.total)} {tCommon('bdt')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => approveExpenseMutation.mutate(exp.id)}
                        isLoading={approveExpenseMutation.isPending}
                      >
                        {locale === 'bn' ? 'অনুমোদন (Approve)' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => rejectExpenseMutation.mutate(exp.id)}
                        isLoading={rejectExpenseMutation.isPending}
                      >
                        {locale === 'bn' ? 'বাতিল (Reject)' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="font-semibold text-sm text-text-primary">
                {locale === 'bn' ? 'আজকের মেন্যু নির্ধারণ করুন' : 'Declare / Override Daily Menu'}
              </h4>
              <Select
                label={locale === 'bn' ? 'প্রধান প্রোটিন' : 'Main Protein'}
                value={menuProtein}
                options={[
                  { value: ProteinType.FISH, label: locale === 'bn' ? 'মাছ (Fish)' : 'Fish' },
                  {
                    value: ProteinType.CHICKEN,
                    label: locale === 'bn' ? 'মুরগি (Chicken)' : 'Chicken'
                  },
                  { value: ProteinType.OTHER, label: locale === 'bn' ? 'অন্যান্য (Other)' : 'Other' }
                ]}
                onChange={(e) => setMenuProtein(e.target.value as ProteinType)}
              />
              <Input
                label={locale === 'bn' ? 'মেন্যু বিবরণ' : 'Menu Description'}
                value={menuNote}
                onChange={(e) => setMenuNote(e.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateMenuMutation.mutate()}
                isLoading={updateMenuMutation.isPending}
              >
                {locale === 'bn' ? 'মেন্যু আপডেট করুন' : 'Save Daily Menu'}
              </Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'বাজার রোস্টার ও গ্যাস/জ্বালানি বিল'
                : 'Shopping Roster & Fuel Expense Control'}
            </h3>

            <div className="space-y-3">
              <Select
                label={locale === 'bn' ? 'বাজারকারী সদস্য নির্বাচন' : 'Assign Shopper'}
                value={assignMemberId}
                options={memberOptions}
                onChange={(e) => setAssignMemberId(e.target.value)}
              />
              <Input
                label={locale === 'bn' ? 'বাজারের তারিখ' : 'Duty Date'}
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => assignRosterMutation.mutate()}
                  isLoading={assignRosterMutation.isPending}
                >
                  {locale === 'bn' ? 'রোস্টারে নিযুক্ত করুন' : 'Assign to Date'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => autoShuffleMutation.mutate()}
                  isLoading={autoShuffleMutation.isPending}
                >
                  {locale === 'bn' ? 'ফাঁকা দিনগুলো অটো-শাফল করুন' : 'Auto-Shuffle Unassigned Days'}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="font-semibold text-sm text-text-primary">
                {locale === 'bn'
                  ? 'গ্যাস সিলিন্ডার / জ্বালানি খরচ রেকর্ড করুন'
                  : 'Record Gas / Fuel Expense'}
              </h4>
              <Input
                label={locale === 'bn' ? 'গ্যাস বিলের পরিমাণ (টাকা)' : 'Fuel Cost Amount (BDT)'}
                type="number"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(Number(e.target.value))}
              />
              <Input
                label={locale === 'bn' ? 'বিবরণ' : 'Fuel Note'}
                value={fuelNote}
                onChange={(e) => setFuelNote(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => recordFuelMutation.mutate()}
                isLoading={recordFuelMutation.isPending}
              >
                {locale === 'bn' ? 'গ্যাস খরচ পোস্ট করুন' : 'Record Fuel Expense'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 5: MESS CONFIGURATION SETTINGS */}
      {activeSection === 'settings' && (
        <Card className="max-w-2xl space-y-4">
          <h3 className="font-bold text-base text-text-primary">
            {locale === 'bn'
              ? 'মেসের নিয়মাবলী ও কনফিগারেশন সেটিংস'
              : 'Mess Rules & Configuration Settings'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={tMess('messName')}
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
            />
            <Input
              label={tMess('cutoffTime')}
              value={settingsCutoff}
              onChange={(e) => setSettingsCutoff(e.target.value)}
            />
            <Input
              label={tMess('mealRate')}
              type="number"
              step="0.5"
              value={settingsMealRate}
              onChange={(e) => setSettingsMealRate(Number(e.target.value))}
            />
            <Input
              label={tMess('graceDays')}
              type="number"
              value={settingsGraceDays}
              onChange={(e) => setSettingsGraceDays(Number(e.target.value))}
            />
            <Input
              label={tMess('warningDays')}
              type="number"
              value={settingsWarningDays}
              onChange={(e) => setSettingsWarningDays(Number(e.target.value))}
            />
            <Input
              label={tMess('shoppersPerDay')}
              type="number"
              value={settingsShoppersPerDay}
              onChange={(e) => setSettingsShoppersPerDay(Number(e.target.value))}
            />
            <Input
              label={tMess('shopTimesPerMonth')}
              type="number"
              value={settingsShopQuota}
              onChange={(e) => setSettingsShopQuota(Number(e.target.value))}
            />
          </div>

          <Button
            onClick={() => updateMessSettingsMutation.mutate()}
            isLoading={updateMessSettingsMutation.isPending}
          >
            {locale === 'bn' ? 'মেস সেটিংস সংরক্ষণ করুন' : 'Save Mess Configuration'}
          </Button>
        </Card>
      )}

      {/* SECTION 6: NOTICES, MONTH CLOSE & AUDIT */}
      {activeSection === 'operations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'জরুরি বিজ্ঞপ্তি প্রকাশ ও পরিচালনা'
                : 'Publish & Manage Official Notices'}
            </h3>
            <Input
              label={locale === 'bn' ? 'বিজ্ঞপ্তির শিরোনাম' : 'Notice Title'}
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
            />
            <Textarea
              label={locale === 'bn' ? 'বিস্তারিত বার্তা' : 'Notice Details'}
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.target.value)}
            />
            <Button
              onClick={() => postNoticeMutation.mutate()}
              isLoading={postNoticeMutation.isPending}
              disabled={!noticeTitle.trim()}
            >
              {locale === 'bn' ? 'বিজ্ঞপ্তি প্রকাশ করুন' : 'Publish Notice'}
            </Button>

            {notices && notices.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 bg-surface-elevated rounded-token border border-border flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">
                        {n.title}
                      </span>
                      <span className="text-xs text-text-secondary">{n.body}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteNoticeMutation.mutate(n.id)}
                    >
                      {tCommon('delete')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {locale === 'bn'
                ? 'মাসিক হিসাব সমাপ্তি (Month Close) ও অডিট লগ'
                : 'Month-End Close & Recent Audit Logs'}
            </h3>
            <div className="flex items-end gap-3">
              <Input
                label={locale === 'bn' ? 'মাস নির্বাচন করুন' : 'Target Month'}
                type="month"
                value={closeMonthTarget}
                onChange={(e) => setCloseMonthTarget(e.target.value)}
              />
              <Button
                onClick={() => closeMonthMutation.mutate()}
                isLoading={closeMonthMutation.isPending}
              >
                {locale === 'bn' ? 'মাস সমাপ্ত ও লক করুন' : 'Close & Seal Month'}
              </Button>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <span className="text-xs font-semibold text-text-secondary block">
                {locale === 'bn' ? 'সর্বশেষ অ্যাডমিন অডিট লগ' : 'Latest Admin Audit Trail'}
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {(auditLogs || []).slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-surface-elevated rounded-token border border-border text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{log.action}</span>
                      <span className="text-text-muted">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.reason && <p className="text-text-secondary">{log.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Boarder Modal */}
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
          <Select
            label={t('role')}
            value={newRole}
            options={[
              { value: MembershipRole.BOARDER, label: t('boarder') },
              { value: MembershipRole.MANAGER, label: t('manager') }
            ]}
            onChange={(e) => setNewRole(e.target.value as MembershipRole)}
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

      {/* Edit Member Cook Bill Modal */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title={
          locale === 'bn'
            ? `সদস্য সম্পাদনা: ${editingMember?.user?.name || ''}`
            : `Edit Member: ${editingMember?.user?.name || ''}`
        }
      >
        <div className="space-y-4">
          <Input
            label={t('cookBill')}
            type="number"
            value={editCookBill}
            onChange={(e) => setEditCookBill(Number(e.target.value))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setEditingMember(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() =>
                editingMember &&
                updateMemberMutation.mutate({
                  id: editingMember.id,
                  cookBillAmount: Number(editCookBill)
                })
              }
              isLoading={updateMemberMutation.isPending}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

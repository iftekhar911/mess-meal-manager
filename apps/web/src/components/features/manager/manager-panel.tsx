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
  LedgerType,
  ExpenseStatus,
  ShoppingExpenseDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select } from '../../ui/select';
import { Modal } from '../../ui/modal';
import { apiFetch, ApiClientError } from '../../../lib/api-client';

export interface ManagerPanelProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

type AdminSection = 'members' | 'finance' | 'meals' | 'fuel' | 'settings';

/**
 * Clean, mobile-friendly Manager Command Center with strict role guard,
 * active/inactive member filters, confirmation dialogs, and instant cache sync.
 */
export const ManagerPanel: React.FC<ManagerPanelProps> = ({ messId, isManager = false, token }) => {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tMess = useTranslations('messes');
  const tMeals = useTranslations('meals');
  const tLedger = useTranslations('ledger');
  const tShopper = useTranslations('shopper');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [section, setSection] = useState<AdminSection>('members');
  const [memberFilter, setMemberFilter] = useState<'active' | 'inactive'>('active');
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const notify = (type: 'success' | 'error', text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 3500);
  };

  const formatDigit = (val: number | string) =>
    locale === 'bn' ? toBengaliDigits(val) : String(val);

  const today = getDhakaDateString();
  const currentMonth = today.slice(0, 7);

  // Queries
  const { data: messes } = useQuery<MessDto[]>({
    queryKey: ['my-messes', token],
    queryFn: () => apiFetch<MessDto[]>('/messes/my', {}, token),
    enabled: !!messId && isManager
  });
  const currentMess = messes?.find((m) => m.id === messId);

  const { data: members, isLoading: isMembersLoading } = useQuery<MembershipDto[]>({
    queryKey: ['mess-members-all', messId],
    queryFn: () =>
      apiFetch<MembershipDto[]>(`/messes/${messId}/members?activeOnly=false`, {}, token),
    enabled: !!messId && isManager
  });

  const { data: expenses } = useQuery<ShoppingExpenseDto[]>({
    queryKey: ['expenses-shopping', messId, currentMonth],
    queryFn: () =>
      apiFetch<ShoppingExpenseDto[]>(
        `/messes/${messId}/expenses/shopping?month=${currentMonth}`,
        {},
        token
      ),
    enabled: !!messId && isManager
  });

  // Member form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MembershipRole>(MembershipRole.BOARDER);
  const [newCookBill, setNewCookBill] = useState(250);
  const [editingMember, setEditingMember] = useState<MembershipDto | null>(null);
  const [editCookBill, setEditCookBill] = useState(250);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<MembershipDto | null>(null);

  // Finance states
  const activeMembers = (members || []).filter((m) => m.isActive);
  const inactiveMembers = (members || []).filter((m) => !m.isActive);
  const [financeMemberId, setFinanceMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState(1000);
  const [depositNote, setDepositNote] = useState('');
  const [adjAmount, setAdjAmount] = useState(-100);
  const [adjType, setAdjType] = useState<LedgerType>(LedgerType.ADJUSTMENT);
  const [adjReason, setAdjReason] = useState('');

  // Meal override states
  const [ovMemberId, setOvMemberId] = useState('');
  const [ovDate, setOvDate] = useState(today);
  const [ovSlot, setOvSlot] = useState<SlotType>(SlotType.LUNCH);
  const [ovStatus, setOvStatus] = useState(true);
  const [ovGuests, setOvGuests] = useState(0);
  const [ovReason, setOvReason] = useState('');

  // Fuel states
  const [fuelAmount, setFuelAmount] = useState(1400);
  const [fuelNote, setFuelNote] = useState('');

  // Settings states
  const [messName, setMessName] = useState('');
  const [cutoffTime, setCutoffTime] = useState('22:00:00');
  const [mealRate, setMealRate] = useState(50);
  const [graceDays, setGraceDays] = useState(3);
  const [warningDays, setWarningDays] = useState(2);
  const [shoppersPerDay, setShoppersPerDay] = useState(2);

  useEffect(() => {
    if (activeMembers.length > 0) {
      if (!financeMemberId) setFinanceMemberId(activeMembers[0]!.id);
      if (!ovMemberId) setOvMemberId(activeMembers[0]!.id);
    }
  }, [activeMembers, financeMemberId, ovMemberId]);

  useEffect(() => {
    if (currentMess) {
      setMessName(currentMess.name);
      setCutoffTime(currentMess.cutoffTime);
      setMealRate(Number(currentMess.mealRate));
      setGraceDays(currentMess.graceDays);
      setWarningDays(currentMess.warningDays);
      setShoppersPerDay(currentMess.shoppersPerDay);
    }
  }, [currentMess]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['mess-members'] });
    queryClient.invalidateQueries({ queryKey: ['mess-members-all', messId] });
    queryClient.invalidateQueries({ queryKey: ['my-messes'] });
    queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['shopper-summary'] });
    queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-balance'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
    queryClient.invalidateQueries({ queryKey: ['month-statement'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-shopping'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
  };

  const handleErr = (err: unknown) => {
    notify('error', err instanceof ApiClientError ? err.message : tCommon('error'));
  };

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({
            phone: newPhone,
            name: newName || undefined,
            role: newRole,
            cookBillAmount: Number(newCookBill)
          })
        },
        token
      ),
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewPhone('');
      setNewName('');
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
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
        { method: 'PATCH', body: JSON.stringify(payload) },
        token
      ),
    onSuccess: () => {
      setEditingMember(null);
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messes/${messId}/members/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      setConfirmDeleteMember(null);
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const depositMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/deposit`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: financeMemberId,
            amount: Number(depositAmount),
            date: today,
            note: depositNote
          })
        },
        token
      ),
    onSuccess: () => {
      setDepositNote('');
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const adjustmentMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/ledger/adjustment`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: financeMemberId,
            amount: Number(adjAmount),
            type: adjType,
            date: today,
            reason: adjReason || tLedger('adjustment')
          })
        },
        token
      ),
    onSuccess: () => {
      setAdjReason('');
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const forceOverrideMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/meals/force-override`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipId: ovMemberId,
            date: ovDate,
            slot: ovSlot,
            status: ovStatus,
            eggPreference: EggPreference.NONE,
            guestCount: Number(ovGuests),
            reason: ovReason || tMeals('overrideTitle')
          })
        },
        token
      ),
    onSuccess: () => {
      setOvReason('');
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const fuelMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/expenses/fuel`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(fuelAmount),
            date: today,
            note: fuelNote
          })
        },
        token
      ),
    onSuccess: () => {
      setFuelNote('');
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const expenseDecisionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiFetch(`/messes/${messId}/expenses/shopping/${id}/${action}`, { method: 'POST' }, token),
    onSuccess: () => {
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: messName,
            cutoffTime,
            mealRate: Number(mealRate),
            graceDays: Number(graceDays),
            warningDays: Number(warningDays),
            shoppersPerDay: Number(shoppersPerDay)
          })
        },
        token
      ),
    onSuccess: () => {
      invalidateAll();
      notify('success', tCommon('success'));
    },
    onError: handleErr
  });

  if (!isManager) {
    return (
      <Card className="text-center py-12 space-y-3">
        <h3 className="text-lg font-bold text-text-primary">{t('managerOnly')}</h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">{t('managerOnlyDesc')}</p>
      </Card>
    );
  }

  const displayedMembers = memberFilter === 'active' ? activeMembers : inactiveMembers;
  const activeManagerCount = activeMembers.filter((m) => m.role === MembershipRole.MANAGER).length;
  const totalCookBill = activeMembers.reduce((sum, m) => sum + Number(m.cookBillAmount || 0), 0);
  const pendingExpenses = (expenses || []).filter((e) => e.status === ExpenseStatus.PENDING);

  const memberOptions = activeMembers.map((m) => ({
    value: m.id,
    label: `${m.user?.name || tCommon('member')} (${m.user?.phone || ''})`
  }));

  const sectionButtons: { key: AdminSection; label: string }[] = [
    { key: 'members', label: t('title') },
    { key: 'finance', label: tLedger('recordDeposit') },
    { key: 'meals', label: tMeals('overrideTitle') },
    { key: 'fuel', label: tShopper('recordExpense') },
    { key: 'settings', label: tMess('cutoffTime') }
  ];

  return (
    <div className="space-y-4">
      {bannerMsg && (
        <div
          role="status"
          className={`p-3 rounded-token border text-sm font-semibold flex items-center justify-between ${
            bannerMsg.type === 'success'
              ? 'bg-success-surface border-success/30 text-success'
              : 'bg-danger-surface border-danger/30 text-danger'
          }`}
        >
          <span>{bannerMsg.text}</span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section Pill Bar (wraps cleanly, zero horizontal overflow) */}
      <div className="flex flex-wrap gap-2">
        {sectionButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setSection(btn.key)}
            className={`h-10 px-3.5 rounded-token text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
              section === btn.key
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-secondary border-border hover:bg-surface-elevated'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: MEMBERS */}
      {section === 'members' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <Card className="p-3 text-center">
              <span className="text-xs text-text-secondary block">{t('activeTab')}</span>
              <span className="text-xl font-bold text-text-primary mt-0.5 block">
                {formatDigit(activeMembers.length)}
              </span>
            </Card>
            <Card className="p-3 text-center">
              <span className="text-xs text-text-secondary block">{t('manager')}</span>
              <span className="text-xl font-bold text-primary mt-0.5 block">
                {formatDigit(activeManagerCount)}
              </span>
            </Card>
            <Card className="p-3 text-center">
              <span className="text-xs text-text-secondary block">{t('cookBill')}</span>
              <span className="text-lg sm:text-xl font-bold text-text-primary mt-0.5 block">
                {formatDigit(totalCookBill)}
              </span>
            </Card>
          </div>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberFilter('active')}
                  className={`h-9 px-3 rounded-token text-xs font-semibold border cursor-pointer ${
                    memberFilter === 'active'
                      ? 'bg-primary-surface text-primary border-primary/30'
                      : 'bg-surface text-text-secondary border-border'
                  }`}
                >
                  {t('activeTab')} ({formatDigit(activeMembers.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('inactive')}
                  className={`h-9 px-3 rounded-token text-xs font-semibold border cursor-pointer ${
                    memberFilter === 'inactive'
                      ? 'bg-primary-surface text-primary border-primary/30'
                      : 'bg-surface text-text-secondary border-border'
                  }`}
                >
                  {t('inactiveTab')} ({formatDigit(inactiveMembers.length)})
                </button>
              </div>

              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                + {t('addBoarder')}
              </Button>
            </div>

            {isMembersLoading ? (
              <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
            ) : displayedMembers.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">{tCommon('noData')}</p>
            ) : (
              <div className="divide-y divide-border">
                {displayedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-text-primary text-sm sm:text-base">
                          {m.user?.name || tCommon('member')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-border font-semibold text-text-secondary">
                          {m.role === MembershipRole.MANAGER ? t('manager') : t('boarder')}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {m.user?.phone} · {t('cookBill')}: {formatDigit(m.cookBillAmount)}{' '}
                        {tCommon('bdt')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                        {m.role === MembershipRole.MANAGER ? t('makeBoarder') : t('makeManager')}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateMemberMutation.mutate({ id: m.id, isActive: !m.isActive })
                        }
                      >
                        {m.isActive ? t('deactivate') : t('activate')}
                      </Button>

                      <Button size="sm" variant="danger" onClick={() => setConfirmDeleteMember(m)}>
                        {tCommon('delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION 2: DEPOSITS & ADJUSTMENTS */}
      {section === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">{tLedger('recordDeposit')}</h3>
            <Select
              label={tLedger('selectMember')}
              options={memberOptions}
              value={financeMemberId}
              onChange={(e) => setFinanceMemberId(e.target.value)}
            />
            <Input
              label={tLedger('depositAmount')}
              type="number"
              min="10"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
            <Input
              label={tCommon('note')}
              placeholder="bKash / Cash"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={!financeMemberId || depositAmount <= 0}
              isLoading={depositMutation.isPending}
              onClick={() => depositMutation.mutate()}
            >
              {tLedger('recordDeposit')}
            </Button>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">{tLedger('adjustment')}</h3>
            <Select
              label={tLedger('selectMember')}
              options={memberOptions}
              value={financeMemberId}
              onChange={(e) => setFinanceMemberId(e.target.value)}
            />
            <Select
              label={tCommon('status')}
              options={[
                { value: LedgerType.ADJUSTMENT, label: tLedger('adjustment') },
                { value: LedgerType.REFUND, label: tLedger('refund') }
              ]}
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as LedgerType)}
            />
            <Input
              label={`${tCommon('amount')} (+/-)`}
              type="number"
              value={adjAmount}
              onChange={(e) => setAdjAmount(Number(e.target.value))}
            />
            <Input
              label={tCommon('note')}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
            />
            <Button
              variant="secondary"
              className="w-full"
              disabled={!financeMemberId || adjAmount === 0}
              isLoading={adjustmentMutation.isPending}
              onClick={() => adjustmentMutation.mutate()}
            >
              {tCommon('confirm')}
            </Button>
          </Card>
        </div>
      )}

      {/* SECTION 3: MEAL FORCE OVERRIDE */}
      {section === 'meals' && (
        <Card className="space-y-4 max-w-xl">
          <h3 className="font-bold text-base text-text-primary">{tMeals('overrideTitle')}</h3>
          <Select
            label={tCommon('member')}
            options={memberOptions}
            value={ovMemberId}
            onChange={(e) => setOvMemberId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={tCommon('date')}
              type="date"
              value={ovDate}
              onChange={(e) => setOvDate(e.target.value)}
            />
            <Select
              label={tMeals('slot')}
              options={[
                { value: SlotType.LUNCH, label: tMeals('lunch') },
                { value: SlotType.DINNER, label: tMeals('dinner') }
              ]}
              value={ovSlot}
              onChange={(e) => setOvSlot(e.target.value as SlotType)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={tMeals('status')}
              options={[
                { value: 'true', label: tMeals('on') },
                { value: 'false', label: tMeals('off') }
              ]}
              value={String(ovStatus)}
              onChange={(e) => setOvStatus(e.target.value === 'true')}
            />
            <Input
              label={tMeals('guestCount')}
              type="number"
              min="0"
              max="20"
              value={ovGuests}
              onChange={(e) => setOvGuests(Number(e.target.value))}
            />
          </div>
          <Input
            label={tCommon('note')}
            value={ovReason}
            onChange={(e) => setOvReason(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!ovMemberId}
            isLoading={forceOverrideMutation.isPending}
            onClick={() => forceOverrideMutation.mutate()}
          >
            {tCommon('save')}
          </Button>
        </Card>
      )}

      {/* SECTION 4: PENDING EXPENSE APPROVALS & FUEL */}
      {section === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">
              {tShopper('statusPending')} ({formatDigit(pendingExpenses.length)})
            </h3>
            {pendingExpenses.length === 0 ? (
              <p className="text-sm text-text-muted py-4">{tShopper('noExpenses')}</p>
            ) : (
              <div className="space-y-3">
                {pendingExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-token border border-border flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-semibold text-sm text-text-primary block">
                        {exp.shopper?.user?.name || tCommon('member')}
                      </span>
                      <span className="text-xs text-text-muted">
                        {exp.date} · {formatDigit(exp.total)} {tCommon('bdt')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          expenseDecisionMutation.mutate({ id: exp.id, action: 'reject' })
                        }
                      >
                        {tShopper('rejectExpense')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          expenseDecisionMutation.mutate({ id: exp.id, action: 'approve' })
                        }
                      >
                        {tShopper('approveExpense')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold text-base text-text-primary">{tLedger('fuelCharge')}</h3>
            <Input
              label={tCommon('amount')}
              type="number"
              min="10"
              value={fuelAmount}
              onChange={(e) => setFuelAmount(Number(e.target.value))}
            />
            <Input
              label={tCommon('note')}
              placeholder="LPG cylinder"
              value={fuelNote}
              onChange={(e) => setFuelNote(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={fuelAmount <= 0}
              isLoading={fuelMutation.isPending}
              onClick={() => fuelMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </Card>
        </div>
      )}

      {/* SECTION 5: MESS SETTINGS */}
      {section === 'settings' && (
        <Card className="space-y-4 max-w-xl">
          <h3 className="font-bold text-base text-text-primary">{tMess('messName')}</h3>
          <Input
            label={tMess('messName')}
            value={messName}
            onChange={(e) => setMessName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={tMess('cutoffTime')}
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
            />
            <Input
              label={tMess('mealRate')}
              type="number"
              step="0.5"
              value={mealRate}
              onChange={(e) => setMealRate(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label={tMess('graceDays')}
              type="number"
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
            />
            <Input
              label={tMess('warningDays')}
              type="number"
              value={warningDays}
              onChange={(e) => setWarningDays(Number(e.target.value))}
            />
            <Input
              label={tMess('shoppersPerDay')}
              type="number"
              value={shoppersPerDay}
              onChange={(e) => setShoppersPerDay(Number(e.target.value))}
            />
          </div>
          <Button
            className="w-full"
            isLoading={settingsMutation.isPending}
            onClick={() => settingsMutation.mutate()}
          >
            {tCommon('save')}
          </Button>
        </Card>
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
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <Input
            label={tAuth('nameLabel')}
            placeholder={tAuth('namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('role')}
              options={[
                { value: MembershipRole.BOARDER, label: t('boarder') },
                { value: MembershipRole.MANAGER, label: t('manager') }
              ]}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as MembershipRole)}
            />
            <Input
              label={t('cookBill')}
              type="number"
              value={newCookBill}
              onChange={(e) => setNewCookBill(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!newPhone.trim()}
              isLoading={addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Cook Bill Modal */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title={t('cookBill')}
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-text-primary">{editingMember?.user?.name}</p>
          <Input
            label={t('cookBill')}
            type="number"
            value={editCookBill}
            onChange={(e) => setEditCookBill(Number(e.target.value))}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setEditingMember(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={updateMemberMutation.isPending}
              onClick={() =>
                editingMember &&
                updateMemberMutation.mutate({
                  id: editingMember.id,
                  cookBillAmount: Number(editCookBill)
                })
              }
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(confirmDeleteMember)}
        onClose={() => setConfirmDeleteMember(null)}
        title={tCommon('delete')}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t('removeConfirm')} ({confirmDeleteMember?.user?.name})
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteMember(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={removeMemberMutation.isPending}
              onClick={() =>
                confirmDeleteMember && removeMemberMutation.mutate(confirmDeleteMember.id)
              }
            >
              {tCommon('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

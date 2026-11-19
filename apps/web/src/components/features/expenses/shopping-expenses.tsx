'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExpenseStatus,
  ShoppingExpenseDto,
  toBengaliDigits,
  getDhakaDateString
} from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { apiFetch } from '../../../lib/api-client';

export interface ShoppingExpensesProps {
  messId: string;
  isManager?: boolean;
  token?: string;
}

interface ExpenseRowItem {
  name: string;
  quantity: string;
  price: number;
}

/**
 * Shopping expense list, itemized receipt submission, and manager approval controls.
 */
export const ShoppingExpenses: React.FC<ShoppingExpensesProps> = ({
  messId,
  isManager = false,
  token
}) => {
  const t = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const currentMonth = getDhakaDateString().slice(0, 7);
  const [selectedMonth] = useState(currentMonth);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState(getDhakaDateString());
  const [receiptUrl, setReceiptUrl] = useState('');
  const [items, setItems] = useState<ExpenseRowItem[]>([{ name: '', quantity: '', price: 0 }]);

  const formatDigit = (val: number | string) => {
    return locale === 'bn' ? toBengaliDigits(val) : String(val);
  };

  const getStatusLabel = (status: ExpenseStatus) => {
    if (status === ExpenseStatus.APPROVED) return t('statusApproved');
    if (status === ExpenseStatus.REJECTED) return t('statusRejected');
    return t('statusPending');
  };

  const { data: expenses, isLoading } = useQuery<ShoppingExpenseDto[]>({
    queryKey: ['expenses-shopping', messId, selectedMonth],
    queryFn: () =>
      apiFetch<ShoppingExpenseDto[]>(
        `/messes/${messId}/expenses/shopping?month=${selectedMonth}`,
        {},
        token
      ),
    enabled: !!messId
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/expenses/shopping`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: expenseDate,
            receiptUrl: receiptUrl || undefined,
            items: items.filter((i) => i.name.trim() && i.price > 0)
          })
        },
        token
      ),
    onSuccess: () => {
      setIsRecordModalOpen(false);
      setItems([{ name: '', quantity: '', price: 0 }]);
      setReceiptUrl('');
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
      queryClient.invalidateQueries({ queryKey: ['month-statement', messId] });
    }
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiFetch(`/messes/${messId}/expenses/shopping/${id}/${action}`, { method: 'POST' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
      queryClient.invalidateQueries({ queryKey: ['month-statement', messId] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', messId] });
    }
  });

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: '', price: 0 }]);
  };

  const updateItemRow = (index: number, field: keyof ExpenseRowItem, value: string | number) => {
    const updated = [...items];
    const target = updated[index];
    if (target) {
      if (field === 'price') target.price = Number(value);
      else if (field === 'name') target.name = String(value);
      else if (field === 'quantity') target.quantity = String(value);
      setItems(updated);
    }
  };

  const hasValidItems = items.some((i) => i.name.trim() && i.price > 0);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <h3 className="font-bold text-base sm:text-lg text-text-primary">{t('recordExpense')}</h3>
        <Button onClick={() => setIsRecordModalOpen(true)} size="sm">
          + {t('recordExpense')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary py-6 text-center">{tCommon('loading')}</p>
      ) : !expenses || expenses.length === 0 ? (
        <p className="text-center py-8 text-text-muted text-sm font-medium">{t('noExpenses')}</p>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-token border border-border bg-surface-elevated/30 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <span className="font-bold text-text-primary text-sm sm:text-base block">
                    {exp.shopper?.user?.name || tCommon('member')}
                  </span>
                  <span className="text-xs text-text-muted">{exp.date}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base sm:text-lg text-primary block">
                    {formatDigit(exp.total)} {tCommon('bdt')}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      exp.status === ExpenseStatus.APPROVED
                        ? 'bg-success-surface text-success'
                        : exp.status === ExpenseStatus.REJECTED
                          ? 'bg-danger-surface text-danger'
                          : 'bg-warning-surface text-warning'
                    }`}
                  >
                    {getStatusLabel(exp.status)}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border text-sm">
                {exp.items.map((item) => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-text-primary font-medium">
                      {item.name}
                      {item.quantity && (
                        <span className="text-text-muted text-xs ml-1.5">({item.quantity})</span>
                      )}
                    </span>
                    <span className="font-semibold text-text-secondary whitespace-nowrap">
                      {formatDigit(item.price)} {tCommon('bdt')}
                    </span>
                  </div>
                ))}
              </div>

              {(exp.receiptUrl || (isManager && exp.status === ExpenseStatus.PENDING)) && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  {exp.receiptUrl ? (
                    <a
                      href={exp.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      {t('viewReceipt')}
                    </a>
                  ) : (
                    <div />
                  )}

                  {isManager && exp.status === ExpenseStatus.PENDING && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => decisionMutation.mutate({ id: exp.id, action: 'reject' })}
                        isLoading={decisionMutation.isPending}
                      >
                        {t('rejectExpense')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => decisionMutation.mutate({ id: exp.id, action: 'approve' })}
                        isLoading={decisionMutation.isPending}
                      >
                        {t('approveExpense')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={t('recordExpense')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('date')}
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />

          <Input
            label={t('receipt')}
            placeholder="https://..."
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-2 block">
              {t('items')}
            </label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    placeholder={t('itemName')}
                    className="h-10 px-3 flex-1 min-w-0 bg-surface border border-border rounded-token text-sm text-text-primary"
                    value={item.name}
                    onChange={(e) => updateItemRow(idx, 'name', e.target.value)}
                  />
                  <input
                    placeholder={t('quantity')}
                    className="h-10 px-2 w-20 bg-surface border border-border rounded-token text-sm text-text-primary text-center"
                    value={item.quantity}
                    onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                  />
                  <input
                    placeholder={t('price')}
                    type="number"
                    step="1"
                    min="0"
                    className="h-10 px-2 w-24 bg-surface border border-border rounded-token text-sm text-text-primary text-right"
                    value={item.price || ''}
                    onChange={(e) => updateItemRow(idx, 'price', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={addItemRow}
            >
              + {t('addItem')}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsRecordModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!hasValidItems}
              isLoading={recordMutation.isPending}
              onClick={() => recordMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

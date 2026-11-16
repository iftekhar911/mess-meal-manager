'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingExpenseDto, toBengaliDigits, getDhakaDateString } from '@mess/shared';
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
 * Component for shopping expense records, receipts, and public audit lists.
 */
export const ShoppingExpenses: React.FC<ShoppingExpensesProps> = ({
  messId,
  isManager = false,
  token
}) => {
  const t = useTranslations('nav');
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
            items: items.filter((i) => i.name && i.price > 0)
          })
        },
        token
      ),
    onSuccess: () => {
      setIsRecordModalOpen(false);
      setItems([{ name: '', quantity: '', price: 0 }]);
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
    }
  });

  const approveMutation = useMutation({
    mutationFn: (expenseId: string) =>
      apiFetch(
        `/messes/${messId}/expenses/shopping/${expenseId}/approve`,
        {
          method: 'POST'
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
    }
  });

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: '', price: 0 }]);
  };

  const updateItemRow = (index: number, field: keyof ExpenseRowItem, value: string | number) => {
    const updated = [...items];
    const target = updated[index];
    if (target) {
      if (field === 'price') {
        target.price = Number(value);
      } else if (field === 'name') {
        target.name = String(value);
      } else if (field === 'quantity') {
        target.quantity = String(value);
      }
      setItems(updated);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-text-primary">{t('shopping')}</h3>
        <Button onClick={() => setIsRecordModalOpen(true)} size="sm">
          {tCommon('save')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
      ) : !expenses || expenses.length === 0 ? (
        <Card className="text-center py-8 text-text-secondary text-sm">{tCommon('error')}</Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <Card key={exp.id} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <span className="font-semibold text-text-primary text-base">
                    {exp.shopper?.user?.name || 'Shopper'}
                  </span>
                  <span className="text-xs text-text-muted block">{exp.date}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-primary">
                    {formatDigit(exp.total)} {tCommon('bdt')}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border text-sm">
                {exp.items.map((item) => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between">
                    <span className="text-text-primary">
                      {item.name}{' '}
                      {item.quantity && (
                        <span className="text-text-muted text-xs">({item.quantity})</span>
                      )}
                    </span>
                    <span className="font-medium text-text-secondary">
                      {formatDigit(item.price)} {tCommon('bdt')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {exp.receiptUrl ? (
                  <a
                    href={exp.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {tCommon('appName')}
                  </a>
                ) : (
                  <div />
                )}
                {isManager && exp.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => approveMutation.mutate(exp.id)}
                    isLoading={approveMutation.isPending}
                  >
                    {tCommon('save')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={t('shopping')}
      >
        <div className="space-y-4">
          <Input
            label={tCommon('status')}
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />

          <Input
            label="Receipt Photo URL"
            placeholder="https://..."
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Expense Line Items
            </label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    placeholder="Item name"
                    className="h-10 px-3 flex-1 bg-surface border border-border rounded-token text-sm text-text-primary"
                    value={item.name}
                    onChange={(e) => updateItemRow(idx, 'name', e.target.value)}
                  />
                  <input
                    placeholder="Qty"
                    className="h-10 px-2 w-20 bg-surface border border-border rounded-token text-sm text-text-primary"
                    value={item.quantity}
                    onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    step="0.5"
                    className="h-10 px-2 w-24 bg-surface border border-border rounded-token text-sm text-text-primary"
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
              + Add Item
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsRecordModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              isLoading={recordMutation.isPending}
              onClick={() => recordMutation.mutate()}
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

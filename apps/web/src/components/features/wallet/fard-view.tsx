'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShopperDailySummaryDto, toBengaliDigits, getDhakaDateString } from '@mess/shared';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ShopperSummary } from '../shopper-summary/shopper-summary';
import { apiFetch } from '../../../lib/api-client';

export interface FardItemDto {
  id: string;
  messId: string;
  date: string;
  name: string;
  quantity: string;
  estimatedPrice: string;
  isChecked: boolean;
}

export interface FardViewProps {
  messId: string;
  summary?: ShopperDailySummaryDto;
  canEdit: boolean;
  token?: string;
}

/**
 * Daily Fard (shopping list) screen: shows menu, interactive tick-off checklist,
 * and receipt-photo expense entry for the shopper. Everyone in the mess can read it.
 */
export const FardView: React.FC<FardViewProps> = ({ messId, summary, canEdit, token }) => {
  const t = useTranslations('wallet');
  const tShopper = useTranslations('shopper');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const todayStr = getDhakaDateString();
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [savedExpenseMsg, setSavedExpenseMsg] = useState(false);

  const fmt = (v: number | string) => (locale === 'bn' ? toBengaliDigits(v) : String(v));

  const { data: fardItems, isLoading } = useQuery<FardItemDto[]>({
    queryKey: ['fard-items', messId, todayStr],
    queryFn: () => apiFetch<FardItemDto[]>(`/messes/${messId}/fard?date=${todayStr}`, {}, token),
    enabled: !!messId
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch(
        `/messes/${messId}/fard`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: todayStr,
            name: itemName,
            quantity: itemQty,
            estimatedPrice: Number(itemPrice || 0)
          })
        },
        token
      ),
    onSuccess: () => {
      setItemName('');
      setItemQty('');
      setItemPrice('');
      queryClient.invalidateQueries({ queryKey: ['fard-items', messId, todayStr] });
    }
  });

  const toggleCheckMutation = useMutation({
    mutationFn: ({ id, isChecked }: { id: string; isChecked: boolean }) =>
      apiFetch(
        `/messes/${messId}/fard/${id}`,
        { method: 'PATCH', body: JSON.stringify({ isChecked }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fard-items', messId, todayStr] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messes/${messId}/fard/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fard-items', messId, todayStr] });
    }
  });

  const submitExpenseMutation = useMutation({
    mutationFn: () => {
      const checkedOrAll = (fardItems || []).filter(
        (i) => i.isChecked || Number(i.estimatedPrice) > 0
      );
      return apiFetch(
        `/messes/${messId}/expenses/shopping`,
        {
          method: 'POST',
          body: JSON.stringify({
            date: todayStr,
            receiptUrl: receiptDataUrl || undefined,
            items: checkedOrAll.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: Number(i.estimatedPrice)
            }))
          })
        },
        token
      );
    },
    onSuccess: () => {
      setReceiptDataUrl('');
      setSavedExpenseMsg(true);
      setTimeout(() => setSavedExpenseMsg(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['expenses-shopping', messId] });
      queryClient.invalidateQueries({ queryKey: ['month-statement', messId] });
    }
  });

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 500 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const totalEstimated = (fardItems || []).reduce(
    (sum, i) => sum + Number(i.estimatedPrice || 0),
    0
  );

  return (
    <div className="space-y-4">
      {summary && <ShopperSummary summary={summary} token={token} isShopperOrManager={canEdit} />}

      {/* Interactive Fard Checklist */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-bold text-base text-text-primary">{t('fardChecklist')}</h3>
          <span className="text-sm font-bold text-primary">
            {fmt(totalEstimated.toFixed(2))} {tCommon('bdt')}
          </span>
        </div>

        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (itemName.trim()) addMutation.mutate();
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-2"
          >
            <Input
              placeholder={tShopper('itemName')}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <Input
              placeholder={tShopper('quantity')}
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
            />
            <Input
              placeholder={t('estimatedPrice')}
              type="number"
              min="0"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
            <Button
              type="submit"
              size="md"
              isLoading={addMutation.isPending}
              disabled={!itemName.trim()}
            >
              + {t('addFardItem')}
            </Button>
          </form>
        )}

        {isLoading ? (
          <p className="text-sm text-text-secondary py-4 text-center">{tCommon('loading')}</p>
        ) : !fardItems || fardItems.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">{t('fardEmpty')}</p>
        ) : (
          <div className="divide-y divide-border">
            {fardItems.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    disabled={!canEdit}
                    onChange={() =>
                      canEdit &&
                      toggleCheckMutation.mutate({ id: item.id, isChecked: !item.isChecked })
                    }
                    className="w-5 h-5 accent-primary rounded-token cursor-pointer shrink-0"
                  />
                  <span
                    className={`text-sm font-medium truncate ${
                      item.isChecked ? 'line-through text-text-muted' : 'text-text-primary'
                    }`}
                  >
                    {item.name}
                    {item.quantity && (
                      <span className="text-xs text-text-muted ml-1.5">({item.quantity})</span>
                    )}
                  </span>
                </label>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-text-secondary">
                    {fmt(item.estimatedPrice)} {tCommon('bdt')}
                  </span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger px-2"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shopper Expense Entry with Receipt Photo */}
        {canEdit && fardItems && fardItems.length > 0 && (
          <div className="pt-3 border-t border-border space-y-3">
            {savedExpenseMsg && (
              <p className="text-xs font-semibold text-success bg-success-surface p-2.5 rounded-token">
                {tCommon('success')}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-semibold text-text-secondary flex flex-col gap-1">
                <span>{t('uploadReceipt')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFile}
                  className="text-xs text-text-secondary"
                />
                {receiptDataUrl && (
                  <span className="text-xs text-success font-semibold">{t('receiptAttached')}</span>
                )}
              </label>

              <Button
                size="sm"
                isLoading={submitExpenseMutation.isPending}
                disabled={totalEstimated <= 0}
                onClick={() => submitExpenseMutation.mutate()}
              >
                {tShopper('recordExpense')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useTranslations, useLocale } from 'next-intl';
import { toBengaliDigits } from '@mess/shared';

export interface HeatmapDayCell {
  lunch: boolean;
  dinner: boolean;
  isAutoOff: boolean;
}

export interface HeatmapRow {
  member: {
    id: string;
    name: string;
    role: string;
  };
  totalMeals: number;
  days: Record<string, HeatmapDayCell>;
}

export interface MealHeatmapProps {
  month: string; // YYYY-MM
  daysInMonth: number;
  rows: HeatmapRow[];
}

/**
 * Reusable Meal Heatmap component.
 * Horizontally scrollable, sticky name column, sticky date header,
 * split cells: top half lunch, bottom half dinner.
 * Green represents active meal, gray represents no meal, red represents auto-off.
 */
export const MealHeatmap: React.FC<MealHeatmapProps> = ({ month, daysInMonth, rows }) => {
  const t = useTranslations('meals');
  const locale = useLocale();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    return {
      dayNum,
      dateStr: `${month}-${String(dayNum).padStart(2, '0')}`
    };
  });

  const formatDigit = (num: number | string) => {
    return locale === 'bn' ? toBengaliDigits(num) : String(num);
  };

  // Calculate day column totals
  const dayTotals = daysArray.map((d) => {
    let dayTotal = 0;
    for (const row of rows) {
      const cell = row.days[d.dateStr];
      if (cell?.lunch) dayTotal += 0.5;
      if (cell?.dinner) dayTotal += 0.5;
    }
    return dayTotal;
  });

  // Calculate overall grand total
  const grandTotal = rows.reduce((acc, row) => acc + row.totalMeals, 0);

  return (
    <div className="w-full space-y-3">
      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary bg-surface p-3 rounded-token border border-border card-shadow">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-success inline-block shadow-xs" />
            <span>{t('on')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-surface-elevated border border-border inline-block" />
            <span>{t('off')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-danger inline-block shadow-xs" />
            <span>{t('autoOff')}</span>
          </div>
        </div>
        <div className="font-semibold text-text-primary">
          <span>{t('totalMeals')}: </span>
          <span className="text-primary font-bold text-sm">{formatDigit(grandTotal)}</span>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div className="w-full bg-surface border border-border rounded-token overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-elevated border-b border-border">
                <th className="sticky left-0 z-20 bg-surface-elevated px-4 py-3 min-w-[140px] font-bold text-text-primary border-r border-border shadow-xs">
                  {t('member')}
                </th>
                {daysArray.map((d) => (
                  <th
                    key={d.dateStr}
                    className="px-1.5 py-2 text-center min-w-[42px] font-semibold text-text-secondary border-r border-border text-xs"
                  >
                    {formatDigit(d.dayNum)}
                  </th>
                ))}
                <th className="sticky right-0 z-20 bg-surface-elevated px-3 py-3 text-center min-w-[85px] font-bold text-text-primary border-l border-border shadow-xs">
                  {t('totalMeals')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.member.id}
                  className="border-b border-border hover:bg-surface-elevated/40 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium text-text-primary border-r border-border whitespace-nowrap shadow-xs">
                    <span className="block font-semibold">{row.member.name}</span>
                    <span className="text-2xs text-text-muted">{row.member.role}</span>
                  </td>
                  {daysArray.map((d) => {
                    const cell = row.days[d.dateStr] || {
                      lunch: false,
                      dinner: false,
                      isAutoOff: false
                    };

                    return (
                      <td
                        key={d.dateStr}
                        className="p-1 border-r border-border text-center align-middle"
                      >
                        <div className="w-8 h-8 mx-auto flex flex-col rounded-md overflow-hidden border border-border shadow-2xs">
                          {/* Top half: Lunch */}
                          <div
                            className={clsx(
                              'h-4 w-full transition-colors',
                              cell.isAutoOff
                                ? 'bg-danger'
                                : cell.lunch
                                  ? 'bg-success'
                                  : 'bg-surface-elevated'
                            )}
                            title={`${row.member.name}: ${d.dateStr} ${t('lunch')} (${cell.lunch ? t('on') : t('off')})`}
                          />
                          {/* Bottom half: Dinner */}
                          <div
                            className={clsx(
                              'h-4 w-full border-t border-border/40 transition-colors',
                              cell.isAutoOff
                                ? 'bg-danger'
                                : cell.dinner
                                  ? 'bg-success'
                                  : 'bg-surface-elevated'
                            )}
                            title={`${row.member.name}: ${d.dateStr} ${t('dinner')} (${cell.dinner ? t('on') : t('off')})`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-surface px-3 py-2 text-center font-bold text-text-primary border-l border-border shadow-xs">
                    {formatDigit(row.totalMeals)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-elevated font-bold text-text-primary border-t border-border">
                <td className="sticky left-0 z-20 bg-surface-elevated px-4 py-3 border-r border-border shadow-xs text-xs font-bold">
                  {t('totalMeals')}
                </td>
                {dayTotals.map((tot, idx) => (
                  <td
                    key={idx}
                    className="px-1.5 py-2.5 text-center border-r border-border text-xs font-bold text-text-secondary"
                  >
                    {formatDigit(tot)}
                  </td>
                ))}
                <td className="sticky right-0 z-20 bg-surface-elevated px-3 py-3 text-center border-l border-border text-primary font-bold text-sm shadow-xs">
                  {formatDigit(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

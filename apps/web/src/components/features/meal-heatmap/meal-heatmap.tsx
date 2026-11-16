'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { toBengaliDigits } from '@mess/shared';
import { useLocale } from 'next-intl';

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
  const tCommon = useTranslations('common');
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
    <div className="w-full bg-surface border border-border rounded-token overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="sticky left-0 z-20 bg-surface-elevated px-4 py-3 min-w-[140px] font-semibold text-text-primary border-r border-border">
                {tCommon('appName')}
              </th>
              {daysArray.map((d) => (
                <th
                  key={d.dateStr}
                  className="px-2 py-2 text-center min-w-[44px] font-medium text-text-secondary border-r border-border"
                >
                  {formatDigit(d.dayNum)}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-surface-elevated px-3 py-3 text-center min-w-[80px] font-semibold text-text-primary border-l border-border">
                {tCommon('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.member.id}
                className="border-b border-border hover:bg-surface-elevated/50 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-surface px-4 py-2 font-medium text-text-primary border-r border-border whitespace-nowrap">
                  {row.member.name}
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
                      <div className="w-8 h-8 mx-auto flex flex-col rounded-token overflow-hidden border border-border">
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
                          title={`${row.member.name} - ${d.dateStr} ${t('lunch')}: ${cell.lunch ? 'ON' : 'OFF'}`}
                        />
                        {/* Bottom half: Dinner */}
                        <div
                          className={clsx(
                            'h-4 w-full border-t border-border/50 transition-colors',
                            cell.isAutoOff
                              ? 'bg-danger'
                              : cell.dinner
                                ? 'bg-success'
                                : 'bg-surface-elevated'
                          )}
                          title={`${row.member.name} - ${d.dateStr} ${t('dinner')}: ${cell.dinner ? 'ON' : 'OFF'}`}
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-surface px-3 py-2 text-center font-bold text-text-primary border-l border-border">
                  {formatDigit(row.totalMeals)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-elevated font-semibold text-text-primary border-t border-border">
              <td className="sticky left-0 z-20 bg-surface-elevated px-4 py-3 border-r border-border">
                {tCommon('status')}
              </td>
              {dayTotals.map((tot, idx) => (
                <td key={idx} className="px-2 py-2 text-center border-r border-border text-xs">
                  {formatDigit(tot)}
                </td>
              ))}
              <td className="sticky right-0 z-20 bg-surface-elevated px-3 py-3 text-center border-l border-border text-primary font-bold">
                {formatDigit(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Reusable accessible tab navigation bar primitive with unified radius token
 * and responsive scrollable pill container.
 */
export const Tabs: React.FC<TabsProps> = ({ items, activeKey, onChange, className }) => {
  return (
    <div
      role="tablist"
      className={clsx(
        'flex items-center gap-1.5 p-1 bg-surface-elevated/70 border border-border rounded-token overflow-x-auto no-scrollbar',
        className
      )}
    >
      {items.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={clsx(
              'h-10 px-3.5 rounded-token text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
              isActive
                ? 'bg-surface text-primary border border-border/80 shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'text-2xs px-1.5 py-0.5 rounded-full font-bold leading-none',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-border text-text-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

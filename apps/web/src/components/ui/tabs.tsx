import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Reusable accessible tab navigation bar primitive with unified radius token.
 */
export const Tabs: React.FC<TabsProps> = ({ items, activeKey, onChange, className }) => {
  return (
    <div
      role="tablist"
      className={clsx(
        'flex items-center gap-2 overflow-x-auto pb-1 border-b border-border',
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
              'h-11 px-4 rounded-token text-sm font-medium transition-colors whitespace-nowrap border',
              isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-elevated'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

import React from 'react';
import { clsx } from 'clsx';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusDotProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

/**
 * Visual status dot indicator.
 */
export const StatusDot: React.FC<StatusDotProps> = ({ status, label, className }) => {
  const dotStyles: Record<StatusVariant, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-border-strong'
  };

  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('w-2.5 h-2.5 rounded-full inline-block', dotStyles[status])} />
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </span>
  );
};

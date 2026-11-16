import React from 'react';
import { clsx } from 'clsx';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight hover/focus tooltip primitive.
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  return (
    <span className={clsx('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block group-focus-within:block z-50 px-2.5 py-1 text-xs font-medium text-white bg-text-primary rounded-token whitespace-nowrap shadow-md"
      >
        {content}
      </span>
    </span>
  );
};

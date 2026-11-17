import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Standard card surface applying the design token radius, micro-border, and soft elevation.
 */
export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-token p-4 sm:p-5 card-shadow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

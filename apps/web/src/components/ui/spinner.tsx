import React from 'react';
import { clsx } from 'clsx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standard spinner component for async loading states.
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-current border-t-transparent inline-block',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};

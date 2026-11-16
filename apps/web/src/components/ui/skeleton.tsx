import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps {
  className?: string;
}

/**
 * Animated loading placeholder primitive using unified radius token.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse bg-surface-elevated rounded-token', className)}
    />
  );
};

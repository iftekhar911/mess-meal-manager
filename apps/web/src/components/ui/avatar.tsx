import React from 'react';
import { clsx } from 'clsx';
import { BalanceStatus } from '@mess/shared';

export interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  status?: BalanceStatus | null;
  className?: string;
}

/**
 * Avatar component displaying user initials or image.
 * Features an optional status ring representing balance days left
 * (visible only to authorized viewers: the boarder or manager).
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  status,
  className
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg'
  };

  const ringStyles: Record<BalanceStatus, string> = {
    [BalanceStatus.HEALTHY]: 'ring-2 ring-success ring-offset-2 ring-offset-background',
    [BalanceStatus.WARNING]: 'ring-2 ring-warning ring-offset-2 ring-offset-background',
    [BalanceStatus.GRACE]: 'ring-2 ring-danger ring-offset-2 ring-offset-background',
    [BalanceStatus.AUTO_OFF]: 'ring-2 ring-border-strong ring-offset-2 ring-offset-background'
  };

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full bg-surface-elevated font-medium text-text-primary select-none overflow-hidden',
        sizeMap[size],
        status ? ringStyles[status] : '',
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

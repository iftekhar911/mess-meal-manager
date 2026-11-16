import React from 'react';
import { clsx } from 'clsx';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  label: string;
}

/**
 * Accessible icon-only button primitive with minimum 44px touch target support.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', label, className, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover border-transparent',
      secondary: 'bg-surface border-border text-text-primary hover:bg-surface-elevated',
      ghost: 'bg-transparent border-transparent text-text-secondary hover:bg-surface-elevated',
      danger: 'bg-danger text-white hover:opacity-90 border-transparent'
    };

    const sizes = {
      sm: 'w-9 h-9 min-w-[36px] min-h-[36px]',
      md: 'w-11 h-11 min-w-[44px] min-h-[44px]',
      lg: 'w-12 h-12 min-w-[48px] min-h-[48px]'
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={clsx(
          'inline-flex items-center justify-center rounded-token border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

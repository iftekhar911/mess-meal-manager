import React from 'react';
import { clsx } from 'clsx';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

/**
 * Standard button component enforcing identical heights, focus rings,
 * and design tokens across all states.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-token transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-9 px-3.5 text-xs sm:text-sm gap-1.5',
    md: 'h-11 px-4 text-sm sm:text-base gap-2',
    lg: 'h-12 px-6 text-base sm:text-lg gap-2.5'
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover shadow-sm hover:shadow',
    secondary:
      'bg-surface text-text-primary border border-border hover:bg-surface-elevated active:bg-border shadow-xs',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-elevated active:bg-border',
    danger: 'bg-danger text-white hover:opacity-90 active:opacity-100 shadow-sm'
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

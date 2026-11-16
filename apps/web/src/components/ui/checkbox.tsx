import React from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Accessible checkbox primitive with 44px minimum touch area.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={clsx(
          'inline-flex items-center gap-3 min-h-[44px] cursor-pointer select-none',
          className
        )}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className="w-5 h-5 rounded-token border border-border text-primary focus:ring-2 focus:ring-primary accent-primary"
          {...props}
        />
        <span className="text-sm text-text-primary">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
